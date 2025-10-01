import { CountryCode } from '../components/CountryCodeSelector';

type PhoneNumberValidation = {
  isValid: boolean;
  error?: string;
  normalizedNumber?: string;
};

const COUNTRY_PHONE_RULES: Record<string, {
  mobileLength: number | number[];
  removesLeadingZero: boolean;
  mobilePrefix?: string[];
}> = {
  'GB': {
    mobileLength: 10,
    removesLeadingZero: true,
    mobilePrefix: ['7']
  },
  'US': {
    mobileLength: 10,
    removesLeadingZero: false
  },
  'CA': {
    mobileLength: 10,
    removesLeadingZero: false
  },
  'IE': {
    mobileLength: [8, 9],
    removesLeadingZero: true,
    mobilePrefix: ['8']
  },
  'AU': {
    mobileLength: 9,
    removesLeadingZero: true,
    mobilePrefix: ['4']
  },
  'NZ': {
    mobileLength: [8, 9],
    removesLeadingZero: true,
    mobilePrefix: ['2']
  },
  'FR': {
    mobileLength: 9,
    removesLeadingZero: true,
    mobilePrefix: ['6', '7']
  },
  'DE': {
    mobileLength: [10, 11],
    removesLeadingZero: true,
    mobilePrefix: ['15', '16', '17']
  },
  'ES': {
    mobileLength: 9,
    removesLeadingZero: false,
    mobilePrefix: ['6', '7']
  },
  'IT': {
    mobileLength: 10,
    removesLeadingZero: false,
    mobilePrefix: ['3']
  },
  'NL': {
    mobileLength: 9,
    removesLeadingZero: true,
    mobilePrefix: ['6']
  },
  'BE': {
    mobileLength: 9,
    removesLeadingZero: true,
    mobilePrefix: ['4']
  },
  'CH': {
    mobileLength: 9,
    removesLeadingZero: true,
    mobilePrefix: ['7']
  },
  'SE': {
    mobileLength: 9,
    removesLeadingZero: true,
    mobilePrefix: ['7']
  },
  'NO': {
    mobileLength: 8,
    removesLeadingZero: false,
    mobilePrefix: ['4', '9']
  },
  'DK': {
    mobileLength: 8,
    removesLeadingZero: false
  },
  'IN': {
    mobileLength: 10,
    removesLeadingZero: false
  },
  'JP': {
    mobileLength: 10,
    removesLeadingZero: true,
    mobilePrefix: ['70', '80', '90']
  },
  'ZA': {
    mobileLength: 9,
    removesLeadingZero: true,
    mobilePrefix: ['6', '7', '8']
  },
  'BR': {
    mobileLength: 11,
    removesLeadingZero: false
  }
};

export function cleanPhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[\s\-\(\)\+]/g, '');
}

export function normalizePhoneNumber(
  phoneNumber: string,
  selectedCountry: CountryCode
): PhoneNumberValidation {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return {
      isValid: false,
      error: 'Phone number is required'
    };
  }

  let cleaned = phoneNumber.replace(/\D/g, '');

  const countryRule = COUNTRY_PHONE_RULES[selectedCountry.code];
  if (!countryRule) {
    cleaned = cleaned.replace(/^0+/, '');
    const normalized = `${selectedCountry.dial_code}${cleaned}`;
    return {
      isValid: cleaned.length >= 7 && cleaned.length <= 15,
      normalizedNumber: normalized,
      error: cleaned.length < 7 ? 'Phone number is too short' :
             cleaned.length > 15 ? 'Phone number is too long' : undefined
    };
  }

  const dialCodeDigits = selectedCountry.dial_code.replace('+', '');

  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Handle duplicate country codes (e.g., +44447123456789)
  while (cleaned.startsWith(dialCodeDigits)) {
    cleaned = cleaned.substring(dialCodeDigits.length);
  }

  if (countryRule.removesLeadingZero && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  const acceptableLengths = Array.isArray(countryRule.mobileLength)
    ? countryRule.mobileLength
    : [countryRule.mobileLength];

  const isValidLength = acceptableLengths.includes(cleaned.length);

  let isValidPrefix = true;
  if (countryRule.mobilePrefix && countryRule.mobilePrefix.length > 0) {
    isValidPrefix = countryRule.mobilePrefix.some(prefix =>
      cleaned.startsWith(prefix)
    );
  }

  if (!isValidLength) {
    const lengthStr = acceptableLengths.length > 1
      ? `${acceptableLengths.join(' or ')} digits`
      : `${acceptableLengths[0]} digits`;
    return {
      isValid: false,
      error: `Phone number should be ${lengthStr} (excluding country code)`
    };
  }

  if (!isValidPrefix && countryRule.mobilePrefix) {
    return {
      isValid: false,
      error: `Mobile numbers in ${selectedCountry.name} should start with ${countryRule.mobilePrefix.join(' or ')}`
    };
  }

  const normalizedNumber = `${selectedCountry.dial_code}${cleaned}`;

  return {
    isValid: true,
    normalizedNumber: normalizedNumber
  };
}

export function formatPhoneNumberForDisplay(
  phoneNumber: string,
  countryCode?: string
): string {
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (!countryCode) {
    return phoneNumber;
  }

  switch (countryCode) {
    case 'GB':
      if (cleaned.length === 12 && cleaned.startsWith('44')) {
        const number = cleaned.substring(2);
        return `+44 ${number.substring(0, 4)} ${number.substring(4, 7)} ${number.substring(7)}`;
      }
      break;
    case 'US':
    case 'CA':
      if (cleaned.length === 11 && cleaned.startsWith('1')) {
        const number = cleaned.substring(1);
        return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
      }
      break;
  }

  return phoneNumber;
}

export function getPhoneNumberError(
  phoneNumber: string,
  selectedCountry: CountryCode
): string | null {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return null;
  }

  const validation = normalizePhoneNumber(phoneNumber, selectedCountry);
  return validation.error || null;
}