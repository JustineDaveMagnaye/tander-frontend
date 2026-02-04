/**
 * Philippine ID OCR Service
 * Extracts date of birth from Philippine government IDs
 * and validates age requirement (60+)
 *
 * Enhanced with:
 * - Text normalization for common OCR errors
 * - Year-only fallback extraction
 * - Multiple parsing strategies
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import type { FrontendOcrData } from '@/services/api/authApi';

// Default minimum age requirement for TANDER (can be overridden by backend config)
const DEFAULT_MINIMUM_AGE = 60;

/**
 * Common OCR character substitutions
 * ML Kit often misreads these characters
 */
const OCR_CHAR_FIXES: Record<string, string> = {
  'O': '0', 'o': '0',  // O → 0
  'I': '1', 'l': '1', '|': '1',  // I, l, | → 1
  'B': '8',  // B → 8 (in number context)
  'S': '5', 's': '5',  // S → 5 (in number context)
  'Z': '2', 'z': '2',  // Z → 2
  'G': '6', 'g': '6',  // G → 6
  'T': '7',  // T → 7 (sometimes)
};

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

  // === ADDITIONAL PATTERNS for OCR noise ===

  // Dates with mixed separators (common OCR error)
  /(\d{1,2})[\/\-\.\s,]+(\d{1,2})[\/\-\.\s,]+(\d{4})/,
  /(\d{1,2})[\/\-\.\s,]+(\d{1,2})[\/\-\.\s,]+(\d{2})(?:[\/\s]|$)/,

  // Dates stuck together (no separators) - common when OCR misses punctuation
  /(\d{2})(\d{2})(\d{4})/, // MMDDYYYY
  /(\d{4})(\d{2})(\d{2})/, // YYYYMMDD

  // Very permissive: any 6-8 digit sequence near DOB keywords
  /(?:DATE\s*OF\s*BIRTH|DOB|BIRTH)[:\s]*(\d{1,2})\D*(\d{1,2})\D*(\d{2,4})/i,

  // Filipino format variations
  /PETSA[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
  /ARAW[:\s]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/i,
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
    console.log('[OCR] Raw text length:', rawText.length);
    console.log('[OCR] Raw text:', rawText);
    console.log('[OCR] Normalized:', normalizeOcrText(rawText.toUpperCase()));
    console.log('[OCR] =====================================');

    // Log any date-like patterns found in the text for debugging
    const dateMatches = rawText.match(/\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2,4}/g);
    if (dateMatches) {
      console.log('[OCR] Date-like patterns found:', dateMatches);
    }

    // Log any 4-digit years found
    const yearMatches = rawText.match(/\b(19\d{2}|20[0-2]\d)\b/g);
    if (yearMatches) {
      console.log('[OCR] 4-digit years found:', yearMatches);
    }

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

    // Senior Citizen ID holders are automatically 60+ (Philippine law requirement)
    // If configured minimum age is <= 60, they automatically qualify
    if (idType === 'senior_citizen') {
      const seniorCitizenMinAge = 60; // Philippine law: must be 60+ to get SC ID
      return {
        success: true,
        dateOfBirth: null,
        expirationDate,
        age: seniorCitizenMinAge, // Minimum age for senior citizen ID
        idType,
        rawText,
        meetsAgeRequirement: seniorCitizenMinAge >= minimumAge,
        isExpired,
      };
    }

    // Extract DOB
    const dob = parseDateOfBirth(rawText);

    if (!dob) {
      // Provide more specific guidance based on what we found
      let errorMessage = 'Could not find date of birth on ID.';

      // Check if we found some text but no dates
      if (rawText.length > 50) {
        // We found text, but couldn't parse DOB - likely OCR quality issue
        const hasDateKeywords = /DATE|BIRTH|DOB|KAPANGANAKAN|KAARAWAN/i.test(rawText);
        if (hasDateKeywords) {
          errorMessage = 'Found ID text but could not read the date clearly. Please ensure the date of birth is not obscured or blurry.';
        } else {
          errorMessage = 'Could not locate the date of birth field. Please ensure your ID shows a visible date of birth.';
        }
      } else if (rawText.length > 0) {
        // Very little text extracted - image quality issue
        errorMessage = 'Could not read ID text clearly. Please take a closer photo with better lighting.';
      } else {
        // No text at all
        errorMessage = 'No text detected on image. Please ensure the ID is clearly visible and in focus.';
      }

      return {
        success: false,
        dateOfBirth: null,
        expirationDate,
        age: null,
        idType,
        rawText,
        meetsAgeRequirement: false,
        isExpired,
        errorMessage,
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
 * Normalize OCR text to fix common misreads in date contexts
 * Only applies fixes to sequences that look like dates
 */
function normalizeOcrText(text: string): string {
  // First, normalize whitespace
  let normalized = text.replace(/\s+/g, ' ');

  // Find date-like patterns and normalize them
  // Pattern: sequences of numbers/letters with date separators
  const datePatterns = [
    // MM/DD/YYYY or DD/MM/YYYY or similar with various separators
    /([A-Z0-9]{1,2})[\/\-\.\s]([A-Z0-9]{1,2})[\/\-\.\s]([A-Z0-9]{2,4})/gi,
    // YYYY/MM/DD
    /([A-Z0-9]{4})[\/\-\.\s]([A-Z0-9]{1,2})[\/\-\.\s]([A-Z0-9]{1,2})/gi,
    // Standalone 2-digit or 4-digit years
    /\b([A-Z0-9]{2})\b|\b([A-Z0-9]{4})\b/gi,
  ];

  datePatterns.forEach((pattern) => {
    normalized = normalized.replace(pattern, (match) => {
      let fixed = match;
      // Apply character fixes only to the numeric portions
      Object.entries(OCR_CHAR_FIXES).forEach(([from, to]) => {
        // Only fix in sequences that have numbers
        if (/\d/.test(fixed) || /BIRTH|DOB|DATE/i.test(text)) {
          fixed = fixed.replace(new RegExp(from, 'g'), to);
        }
      });
      return fixed;
    });
  });

  return normalized;
}

/**
 * Extract just a birth year from text when full date parsing fails
 * Uses multiple strategies to find a plausible birth year
 */
function extractBirthYearOnly(text: string): number | null {
  const currentYear = new Date().getFullYear();

  // Strategy 1: Look for 4-digit years after DOB/BIRTH keywords
  const dobYearPatterns = [
    /(?:DATE\s*OF\s*BIRTH|DOB|BIRTH\s*DATE|BIRTHDAY|KAPANGANAKAN|KAARAWAN)[:\s]*.*?(\d{4})/i,
    /(?:DATE\s*OF\s*BIRTH|DOB|BIRTH\s*DATE|BIRTHDAY)[:\s]*.*?[\/\-\s](\d{2})(?:[\/\s]|$)/i,  // 2-digit year
  ];

  for (const pattern of dobYearPatterns) {
    const match = text.match(pattern);
    if (match) {
      let year = parseInt(match[1], 10);

      // Handle 2-digit year
      if (year < 100) {
        year = year <= 30 ? 2000 + year : 1900 + year;
      }

      // Validate: person should be 18-120 years old
      const age = currentYear - year;
      if (age >= 18 && age <= 120) {
        console.log(`[OCR] Extracted birth year from keyword context: ${year} (age: ${age})`);
        return year;
      }
    }
  }

  // Strategy 2: Find all 4-digit years and pick the most likely birth year
  const allYears = text.match(/\b(19\d{2}|20[0-2]\d)\b/g);
  if (allYears) {
    const validBirthYears = allYears
      .map((y) => parseInt(y, 10))
      .filter((y) => {
        const age = currentYear - y;
        return age >= 18 && age <= 120;  // Valid human age
      })
      .sort((a, b) => a - b);  // Sort oldest first

    if (validBirthYears.length > 0) {
      // Prefer the oldest year that makes sense (likely DOB, not expiry)
      const year = validBirthYears[0];
      console.log(`[OCR] Extracted birth year from all years: ${year} (age: ${currentYear - year})`);
      return year;
    }
  }

  // Strategy 3: Look for 2-digit years (YY format) after date separators
  const twoDigitPattern = /[\/\-\s](\d{2})(?:[\/\s]|$)/g;
  let match;
  const twoDigitYears: number[] = [];

  while ((match = twoDigitPattern.exec(text)) !== null) {
    let shortYear = parseInt(match[1], 10);
    // Convert: 00-30 = 2000-2030, 31-99 = 1931-1999
    let fullYear = shortYear <= 30 ? 2000 + shortYear : 1900 + shortYear;
    const age = currentYear - fullYear;

    if (age >= 18 && age <= 120) {
      twoDigitYears.push(fullYear);
    }
  }

  if (twoDigitYears.length > 0) {
    // Pick the most plausible (oldest that makes sense for seniors app)
    const sorted = twoDigitYears.sort((a, b) => a - b);
    const year = sorted[0];
    console.log(`[OCR] Extracted birth year from 2-digit: ${year} (age: ${currentYear - year})`);
    return year;
  }

  console.log('[OCR] Could not extract birth year');
  return null;
}

/**
 * Parse date of birth from OCR text
 * Tries multiple strategies: original text, normalized text, and year-only fallback
 */
function parseDateOfBirth(text: string): Date | null {
  const upperText = text.toUpperCase();
  console.log('[OCR] Attempting to parse DOB from text...');

  // Try with both original and normalized text
  const textsToTry = [
    { label: 'original', text: upperText },
    { label: 'normalized', text: normalizeOcrText(upperText) },
  ];

  for (const { label, text: textToSearch } of textsToTry) {
    console.log(`[OCR] Trying ${label} text parsing...`);
    const result = tryParseDatePatterns(textToSearch);
    if (result) {
      console.log(`[OCR] Success with ${label} text`);
      return result;
    }
  }

  // Fallback: Try to extract just the year and estimate DOB
  console.log('[OCR] Trying year-only fallback...');
  const birthYear = extractBirthYearOnly(upperText);
  if (birthYear) {
    // Use January 1st as default for year-only extraction
    const estimatedDob = new Date(birthYear, 0, 1);
    console.log(`[OCR] Using year-only fallback: ${estimatedDob.toISOString()}`);
    return estimatedDob;
  }

  console.log('[OCR] All parsing strategies failed');
  return null;
}

/**
 * Try to parse date using all DOB patterns
 */
function tryParseDatePatterns(text: string): Date | null {

  for (let i = 0; i < DOB_PATTERNS.length; i++) {
    const pattern = DOB_PATTERNS[i];
    const match = text.match(pattern);

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
