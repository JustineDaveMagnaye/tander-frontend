/**
 * ProfileSetup Constants
 */

export const GENDER_OPTIONS = ['Male', 'Female'] as const;
export const INTERESTED_IN_OPTIONS = ['Men', 'Women', 'Both'] as const;

export const STEP_CONFIG = {
  current: 3,
  total: 4,
  label: 'Create Your Profile',
};

export const ERROR_MESSAGES = {
  displayName: 'Please enter your display name',
  birthDate: 'Please enter your birth date (MM/DD/YYYY)',
  birthDateFormat: 'Birth date must be in MM/DD/YYYY format',
  ageRequirement: 'You must be 50 years or older to use TANDER',
  gender: 'Please select your gender',
  interestedIn: 'Please select who you are looking for',
  city: 'Please enter your city',
  profilePhoto: 'Please add a profile photo',
  saveFailed: 'Unable to save profile. Please try again.',
};

export const PLACEHOLDERS = {
  displayName: 'How should we call you?',
  birthDate: 'MM/DD/YYYY',
  city: 'Where are you located?',
};

export const HINTS = {
  displayName: 'This is how you\'ll appear to other members',
  birthDate: 'Only your age will be shown, not your birth date',
  city: 'Helps us find matches near you',
};

export const A11Y_LABELS = {
  displayName: 'Display name input',
  birthDate: 'Birth date input',
  city: 'City input',
  gender: 'Select your gender',
  interestedIn: 'Select who you are looking for',
  photoUpload: 'Add or change profile photo',
  continueButton: 'Continue to next step',
  backButton: 'Go back',
};

// Font scaling limits for accessibility
export const FONT_SCALING = {
  INPUT_MAX_MULTIPLIER: 1.3,
};

// Age requirements
export const MIN_AGE = 50;
export const MAX_AGE = 100;

// Philippine Cities - Major cities and municipalities
export const PHILIPPINE_CITIES = [
  // Metro Manila
  { name: 'Manila', province: 'Metro Manila' },
  { name: 'Quezon City', province: 'Metro Manila' },
  { name: 'Makati', province: 'Metro Manila' },
  { name: 'Pasig', province: 'Metro Manila' },
  { name: 'Taguig', province: 'Metro Manila' },
  { name: 'Parañaque', province: 'Metro Manila' },
  { name: 'Caloocan', province: 'Metro Manila' },
  { name: 'Las Piñas', province: 'Metro Manila' },
  { name: 'Muntinlupa', province: 'Metro Manila' },
  { name: 'Marikina', province: 'Metro Manila' },
  { name: 'Pasay', province: 'Metro Manila' },
  { name: 'Valenzuela', province: 'Metro Manila' },
  { name: 'Mandaluyong', province: 'Metro Manila' },
  { name: 'San Juan', province: 'Metro Manila' },
  { name: 'Malabon', province: 'Metro Manila' },
  { name: 'Navotas', province: 'Metro Manila' },
  { name: 'Pateros', province: 'Metro Manila' },

  // Luzon - Major Cities
  { name: 'Baguio', province: 'Benguet' },
  { name: 'San Fernando', province: 'La Union' },
  { name: 'Dagupan', province: 'Pangasinan' },
  { name: 'Olongapo', province: 'Zambales' },
  { name: 'Angeles', province: 'Pampanga' },
  { name: 'San Fernando', province: 'Pampanga' },
  { name: 'Malolos', province: 'Bulacan' },
  { name: 'Meycauayan', province: 'Bulacan' },
  { name: 'Antipolo', province: 'Rizal' },
  { name: 'Cainta', province: 'Rizal' },
  { name: 'Taytay', province: 'Rizal' },
  { name: 'Biñan', province: 'Laguna' },
  { name: 'Santa Rosa', province: 'Laguna' },
  { name: 'San Pedro', province: 'Laguna' },
  { name: 'Calamba', province: 'Laguna' },
  { name: 'Cabuyao', province: 'Laguna' },
  { name: 'Bacoor', province: 'Cavite' },
  { name: 'Imus', province: 'Cavite' },
  { name: 'Dasmariñas', province: 'Cavite' },
  { name: 'General Trias', province: 'Cavite' },
  { name: 'Cavite City', province: 'Cavite' },
  { name: 'Batangas City', province: 'Batangas' },
  { name: 'Lipa', province: 'Batangas' },
  { name: 'Lucena', province: 'Quezon' },
  { name: 'Naga', province: 'Camarines Sur' },
  { name: 'Legazpi', province: 'Albay' },

  // Visayas - Major Cities
  { name: 'Cebu City', province: 'Cebu' },
  { name: 'Mandaue', province: 'Cebu' },
  { name: 'Lapu-Lapu', province: 'Cebu' },
  { name: 'Talisay', province: 'Cebu' },
  { name: 'Iloilo City', province: 'Iloilo' },
  { name: 'Bacolod', province: 'Negros Occidental' },
  { name: 'Dumaguete', province: 'Negros Oriental' },
  { name: 'Tagbilaran', province: 'Bohol' },
  { name: 'Tacloban', province: 'Leyte' },
  { name: 'Ormoc', province: 'Leyte' },
  { name: 'Roxas', province: 'Capiz' },

  // Mindanao - Major Cities
  { name: 'Davao City', province: 'Davao del Sur' },
  { name: 'Zamboanga City', province: 'Zamboanga del Sur' },
  { name: 'Cagayan de Oro', province: 'Misamis Oriental' },
  { name: 'General Santos', province: 'South Cotabato' },
  { name: 'Butuan', province: 'Agusan del Norte' },
  { name: 'Iligan', province: 'Lanao del Norte' },
  { name: 'Cotabato City', province: 'Maguindanao' },
  { name: 'Marawi', province: 'Lanao del Sur' },
  { name: 'Koronadal', province: 'South Cotabato' },
  { name: 'Tagum', province: 'Davao del Norte' },
  { name: 'Panabo', province: 'Davao del Norte' },
  { name: 'Digos', province: 'Davao del Sur' },
  { name: 'Surigao', province: 'Surigao del Norte' },
  { name: 'Ozamiz', province: 'Misamis Occidental' },
  { name: 'Dipolog', province: 'Zamboanga del Norte' },
  { name: 'Pagadian', province: 'Zamboanga del Sur' },

  // Other Notable Cities
  { name: 'Puerto Princesa', province: 'Palawan' },
  { name: 'Tuguegarao', province: 'Cagayan' },
  { name: 'Santiago', province: 'Isabela' },
  { name: 'Cabanatuan', province: 'Nueva Ecija' },
  { name: 'Tarlac City', province: 'Tarlac' },
  { name: 'San Jose', province: 'Nueva Ecija' },
  { name: 'Laoag', province: 'Ilocos Norte' },
  { name: 'Vigan', province: 'Ilocos Sur' },
] as const;
