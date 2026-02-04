/**
 * Philippine ID OCR Service
 * Extracts date of birth from Philippine government IDs
 * and validates age requirement (60+)
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import type { FrontendOcrData } from '@/services/api/authApi';

// Default minimum age requirement for TANDER (can be overridden by backend config)
const DEFAULT_MINIMUM_AGE = 60;

// Philippine ID types
type PhilippineIDType =
  | 'philsys'
  | 'drivers_license'
  | 'sss'
  | 'umid'
  | 'senior_citizen'
  | 'pwd'
  | 'passport'
  | 'unknown';

export interface OCRResult {
  success: boolean;
  dateOfBirth: Date | null;
  expirationDate: Date | null;
  age: number | null;
  idType: PhilippineIDType;
  rawText: string;
  meetsAgeRequirement: boolean;
  isExpired: boolean;
  errorMessage?: string;
}

// DOB patterns for different Philippine IDs
// Added more flexible patterns to handle OCR variations
const DOB_PATTERNS = [
  // PWD/OSCA ID format: "DATE OF BIRTH / AGE" with MM-DD-YY/AGE format
  /DATE\s*OF\s*BIRTH\s*[\/\|]?\s*AGE[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /BIRTH\s*[\/\|]\s*AGE[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,

  // OSCA/Senior Citizen specific patterns
  /BIRTHDATE[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /KAARAWAN[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i, // Filipino for birthday
  /PETSA\s*NG\s*KAPANGANAKAN[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /ARAW\s*NG\s*KAPANGANAKAN[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,

  // Two-digit year formats (common in Philippine IDs)
  /DATE\s*OF\s*BIRTH[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2})(?:[\/\s]|\s|$)/i,

  // PhilSys National ID formats (4-digit year)
  /DATE\s*OF\s*BIRTH[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})/i,
  /DATE\s*OF\s*BIRTH[:\s]*([A-Z]{3,9})\s*(\d{1,2})[,\s]+(\d{4})/i, // "DATE OF BIRTH JANUARY 15, 1960"
  /DOB[:\s]*(\d{4})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{1,2})/i, // YYYY-MM-DD format
  /DOB[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})/i, // MM/DD/YYYY format
  /DOB[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2})(?:[\/\s]|$)/i, // MM-DD-YY format

  // Driver's License patterns
  /BIRTH\s*DATE[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})/i,
  /BIRTH\s*DATE[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2})(?:[\/\s]|$)/i,
  /D\.?O\.?B\.?[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,

  // SSS/UMID patterns
  /BIRTHDAY[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /BIRTH[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /KAPANGANAKAN[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,

  // Month name patterns (e.g., "JAN 15, 1960" or "JANUARY 15 1960")
  /([A-Z]{3,9})\s*(\d{1,2})[,\s]+(\d{4})/i,
  /(\d{1,2})\s+([A-Z]{3,9})\s+(\d{4})/i, // "15 JANUARY 1960"

  // Generic date patterns (fallback) - captures any date-like format
  /(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})/,
  /(\d{4})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{1,2})/,
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?:[\/\s]|$)/, // MM-DD-YY fallback

  // Dates with spaces instead of separators (OCR sometimes misses punctuation)
  /(\d{2})\s+(\d{2})\s+(\d{4})/,
  /(\d{2})\s+(\d{2})\s+(\d{2})(?:\s|$)/, // 2-digit year with spaces
];

// Expiration date patterns for Philippine IDs
const EXPIRY_PATTERNS = [
  // Common expiry formats
  /EXPIR(?:Y|ES|ATION)?\s*(?:DATE)?[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /EXP(?:IRY)?[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /VALID\s*(?:UNTIL|THRU|TO)[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /VALIDITY[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /DATE\s*OF\s*EXPIRY[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,

  // Filipino terms
  /PETSA\s*NG\s*PAGKAWALANG\s*BISA[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /HANGGANG[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,

  // Driver's license specific
  /DL\s*EXPIRY[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,

  // Month name formats
  /EXPIR(?:Y|ES|ATION)?[:\s]*([A-Z]{3,9})\s*(\d{1,2})[,\s]+(\d{4})/i,
  /VALID\s*(?:UNTIL|THRU)[:\s]*([A-Z]{3,9})\s*(\d{1,2})[,\s]+(\d{4})/i,
];

// Keywords to identify ID type
const ID_TYPE_KEYWORDS: Record<PhilippineIDType, string[]> = {
  philsys: ['PHILIPPINE IDENTIFICATION', 'PHILSYS', 'PSN', 'NATIONAL ID', 'PHIL ID', 'PHILIPPINE STATISTICS'],
  drivers_license: ['DRIVER', 'LICENSE', 'LTO', 'LAND TRANSPORTATION', "DRIVER'S LICENSE", 'NON-PROFESSIONAL', 'PROFESSIONAL'],
  sss: ['SOCIAL SECURITY', 'SSS', 'SS NO', 'SSS ID'],
  umid: ['UMID', 'UNIFIED', 'MULTI-PURPOSE', 'UNIFIED MULTI-PURPOSE'],
  senior_citizen: [
    'SENIOR CITIZEN', 'OSCA', 'OFFICE OF SENIOR', 'SENIOR CITIZENS',
    'SC ID', 'SCID', 'OFFICE FOR SENIOR', 'AFFAIRS OF SENIOR',
    'MATATANDA', 'NAKATATANDA', // Filipino terms
    'SENIOR ID', 'GOLDEN ID'
  ],
  pwd: [
    'PERSONS WITH DISABILITY', 'PWD', 'DISABILITY', 'TYPE OF DISABILITY',
    'HARD OF HEARING', 'DEAF', 'BLIND', 'ORTHOPEDIC', 'VISUAL IMPAIRMENT',
    'PSYCHOSOCIAL', 'INTELLECTUAL', 'LEARNING DISABILITY', 'SPEECH IMPAIRMENT',
    'NCDA', 'NATIONAL COUNCIL ON DISABILITY', 'PWD ID'
  ],
  passport: ['PASSPORT', 'PASAPORTE', 'DEPARTMENT OF FOREIGN AFFAIRS', 'DFA'],
  unknown: [],
};

/**
 * Extract date of birth from ID image using ML Kit OCR
 * @param imageUri - URI of the ID image to scan
 * @param minimumAge - Minimum age requirement (defaults to 60, can be configured from backend)
 */
export async function extractDOBFromID(
  imageUri: string,
  minimumAge: number = DEFAULT_MINIMUM_AGE
): Promise<OCRResult> {
  try {
    // Perform OCR on the image
    console.log('[OCR] Starting text recognition on:', imageUri);
    console.log('[OCR] Minimum age requirement:', minimumAge);
    const result = await TextRecognition.recognize(imageUri);
    const rawText = result.text;

    // DEBUG: Log the extracted text so we can see what ML Kit found
    console.log('[OCR] ========== EXTRACTED TEXT ==========');
    console.log('[OCR] Raw text:', rawText);
    console.log('[OCR] =====================================');

    if (!rawText || rawText.trim().length === 0) {
      console.log('[OCR] No text found in image');
      return {
        success: false,
        dateOfBirth: null,
        expirationDate: null,
        age: null,
        idType: 'unknown',
        rawText: '',
        meetsAgeRequirement: false,
        isExpired: false,
        errorMessage:
          'Could not read text from ID. Please ensure good lighting and a clear image.',
      };
    }

    // Detect ID type
    const idType = detectIDType(rawText);

    // Extract expiration date
    const expirationDate = parseExpirationDate(rawText);
    const isExpired = expirationDate ? expirationDate < new Date() : false;
    if (expirationDate) {
      console.log('[OCR] Expiration date found:', expirationDate.toISOString(), 'Expired:', isExpired);
    }

    // Senior Citizen ID holders are automatically 60+
    if (idType === 'senior_citizen') {
      return {
        success: true,
        dateOfBirth: null,
        expirationDate,
        age: 60, // Minimum age for senior citizen ID
        idType,
        rawText,
        meetsAgeRequirement: true,
        isExpired,
      };
    }

    // Extract DOB
    const dob = parseDateOfBirth(rawText);

    if (!dob) {
      return {
        success: false,
        dateOfBirth: null,
        expirationDate,
        age: null,
        idType,
        rawText,
        meetsAgeRequirement: false,
        isExpired,
        errorMessage:
          'Could not find date of birth on ID. Please try again with a clearer image.',
      };
    }

    // Calculate age
    const age = calculateAge(dob);
    const meetsAgeRequirement = age >= minimumAge;

    return {
      success: true,
      dateOfBirth: dob,
      expirationDate,
      age,
      idType,
      rawText,
      meetsAgeRequirement,
      isExpired,
      errorMessage: meetsAgeRequirement
        ? undefined
        : `You must be ${minimumAge} or older to use Tander. Based on your ID, you are ${age} years old.`,
    };
  } catch (error) {
    console.error('[OCR] Error extracting DOB:', error);
    return {
      success: false,
      dateOfBirth: null,
      expirationDate: null,
      age: null,
      idType: 'unknown',
      rawText: '',
      meetsAgeRequirement: false,
      isExpired: false,
      errorMessage: 'Failed to scan ID. Please try again.',
    };
  }
}

/**
 * Detect the type of Philippine ID from text
 */
function detectIDType(text: string): PhilippineIDType {
  const upperText = text.toUpperCase();

  for (const [idType, keywords] of Object.entries(ID_TYPE_KEYWORDS)) {
    if (idType === 'unknown') continue;
    if (keywords.some((keyword) => upperText.includes(keyword))) {
      return idType as PhilippineIDType;
    }
  }

  return 'unknown';
}

// Month name to number mapping
const MONTH_NAMES: Record<string, number> = {
  JAN: 1, JANUARY: 1,
  FEB: 2, FEBRUARY: 2,
  MAR: 3, MARCH: 3,
  APR: 4, APRIL: 4,
  MAY: 5,
  JUN: 6, JUNE: 6,
  JUL: 7, JULY: 7,
  AUG: 8, AUGUST: 8,
  SEP: 9, SEPT: 9, SEPTEMBER: 9,
  OCT: 10, OCTOBER: 10,
  NOV: 11, NOVEMBER: 11,
  DEC: 12, DECEMBER: 12,
};

/**
 * Parse date of birth from OCR text
 */
function parseDateOfBirth(text: string): Date | null {
  const upperText = text.toUpperCase();
  console.log('[OCR] Attempting to parse DOB from text...');

  for (let i = 0; i < DOB_PATTERNS.length; i++) {
    const pattern = DOB_PATTERNS[i];
    const match = upperText.match(pattern);

    if (match) {
      console.log(`[OCR] Pattern ${i} matched:`, match[0]);
      try {
        let year: number, month: number, day: number;

        // Check if first capture group is a month name
        if (isNaN(parseInt(match[1], 10))) {
          // Month name format (e.g., "JANUARY 15, 1960")
          const monthName = match[1].toUpperCase();
          month = MONTH_NAMES[monthName];
          if (!month) {
            console.log('[OCR] Unknown month name:', monthName);
            continue;
          }
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        } else if (isNaN(parseInt(match[2], 10))) {
          // Day first, then month name (e.g., "15 JANUARY 1960")
          day = parseInt(match[1], 10);
          const monthName = match[2].toUpperCase();
          month = MONTH_NAMES[monthName];
          if (!month) {
            console.log('[OCR] Unknown month name:', monthName);
            continue;
          }
          year = parseInt(match[3], 10);
        } else if (match[1].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10);
          day = parseInt(match[3], 10);
        } else if (parseInt(match[3], 10) > 1900) {
          // MM/DD/YYYY format (common in Philippines)
          month = parseInt(match[1], 10);
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        } else if (match[3].length === 2) {
          // Two-digit year format (MM-DD-YY) - common in Philippine IDs
          month = parseInt(match[1], 10);
          day = parseInt(match[2], 10);
          let shortYear = parseInt(match[3], 10);
          // Convert 2-digit year: 00-30 = 2000-2030, 31-99 = 1931-1999
          year = shortYear <= 30 ? 2000 + shortYear : 1900 + shortYear;
          console.log(`[OCR] Converted 2-digit year ${shortYear} to ${year}`);
        } else {
          // Try DD/MM/YYYY format (alternative)
          day = parseInt(match[1], 10);
          month = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        }

        console.log(`[OCR] Parsed: year=${year}, month=${month}, day=${day}`);

        // Validate date components
        if (year < 1900 || year > new Date().getFullYear()) {
          console.log('[OCR] Invalid year:', year);
          continue;
        }
        if (month < 1 || month > 12) {
          console.log('[OCR] Invalid month:', month);
          continue;
        }
        if (day < 1 || day > 31) {
          console.log('[OCR] Invalid day:', day);
          continue;
        }

        const date = new Date(year, month - 1, day);

        // Validate the date is not in the future
        if (date > new Date()) {
          console.log('[OCR] Date is in the future');
          continue;
        }

        // Validate the date is reasonable (person should be at least 18)
        const age = calculateAge(date);
        console.log('[OCR] Calculated age:', age);
        if (age < 18 || age > 120) {
          console.log('[OCR] Age out of reasonable range');
          continue;
        }

        console.log('[OCR] Successfully parsed DOB:', date.toISOString());
        return date;
      } catch (e) {
        console.log('[OCR] Error parsing date:', e);
        continue;
      }
    }
  }

  console.log('[OCR] No DOB pattern matched');
  return null;
}

/**
 * Parse expiration date from OCR text
 */
function parseExpirationDate(text: string): Date | null {
  const upperText = text.toUpperCase();
  console.log('[OCR] Attempting to parse expiration date from text...');

  for (let i = 0; i < EXPIRY_PATTERNS.length; i++) {
    const pattern = EXPIRY_PATTERNS[i];
    const match = upperText.match(pattern);

    if (match) {
      console.log(`[OCR] Expiry pattern ${i} matched:`, match[0]);
      try {
        let year: number, month: number, day: number;

        // Check if first capture group is a month name
        if (isNaN(parseInt(match[1], 10))) {
          // Month name format
          const monthName = match[1].toUpperCase();
          month = MONTH_NAMES[monthName];
          if (!month) continue;
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        } else if (match[3].length === 2) {
          // Two-digit year format (MM-DD-YY)
          month = parseInt(match[1], 10);
          day = parseInt(match[2], 10);
          let shortYear = parseInt(match[3], 10);
          // For expiry dates, 2-digit years are usually future: 00-50 = 2000-2050, 51-99 = 2051-2099
          year = 2000 + shortYear;
          console.log(`[OCR] Converted 2-digit expiry year ${shortYear} to ${year}`);
        } else {
          // MM/DD/YYYY format
          month = parseInt(match[1], 10);
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        }

        console.log(`[OCR] Parsed expiry: year=${year}, month=${month}, day=${day}`);

        // Validate date components
        if (year < 2000 || year > 2100) continue;
        if (month < 1 || month > 12) continue;
        if (day < 1 || day > 31) continue;

        const date = new Date(year, month - 1, day);
        console.log('[OCR] Successfully parsed expiration date:', date.toISOString());
        return date;
      } catch (e) {
        console.log('[OCR] Error parsing expiry date:', e);
        continue;
      }
    }
  }

  console.log('[OCR] No expiration date pattern matched');
  return null;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Convert OCRResult to FrontendOcrData format for backend comparison.
 * This allows the backend to compare its Azure extraction with our ML Kit results.
 *
 * @param ocrResult - The OCR result from extractDOBFromID
 * @returns FrontendOcrData formatted for backend API
 */
export function toFrontendOcrData(ocrResult: OCRResult): FrontendOcrData {
  return {
    extractedAge: ocrResult.age,
    dateOfBirth: ocrResult.dateOfBirth?.toISOString() || null,
    expirationDate: ocrResult.expirationDate?.toISOString() || null,
    idType: ocrResult.idType,
    meetsAgeRequirement: ocrResult.meetsAgeRequirement,
    rawTextLength: ocrResult.rawText?.length || 0,
    ocrEngine: 'ml_kit_text_recognition',
    extractionTimestamp: new Date().toISOString(),
  };
}

export { DEFAULT_MINIMUM_AGE as MINIMUM_AGE };
export type { PhilippineIDType };
