import { describe, expect, test } from 'vitest';
import { cleanPhoneNumber, getPhoneNumberError, normalizePhoneNumber } from '../phoneNumber';
import type { CountryCode } from '../../components/CountryCodeSelector';

describe('Phone Number Normalization', () => {
  const ukCountry: CountryCode = {
    name: 'United Kingdom',
    dial_code: '+44',
    code: 'GB',
    flag: '🇬🇧'
  };

  const usCountry: CountryCode = {
    name: 'United States',
    dial_code: '+1',
    code: 'US',
    flag: '🇺🇸'
  };

  const ieCountry: CountryCode = {
    name: 'Ireland',
    dial_code: '+353',
    code: 'IE',
    flag: '🇮🇪'
  };

  describe('UK Phone Numbers', () => {
    test('normalizes UK number with leading zero', () => {
      const result = normalizePhoneNumber('07123456789', ukCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+447123456789');
    });

    test('normalizes UK number without leading zero', () => {
      const result = normalizePhoneNumber('7123456789', ukCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+447123456789');
    });

    test('handles UK number with country code already present', () => {
      const result = normalizePhoneNumber('+447123456789', ukCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+447123456789');
    });

    test('handles UK number with 00 international prefix', () => {
      const result = normalizePhoneNumber('00447123456789', ukCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+447123456789');
    });

    test('handles UK number with spaces and formatting', () => {
      const result = normalizePhoneNumber('071 234 56789', ukCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+447123456789');
    });

    test('handles UK number with parentheses and dashes', () => {
      const result = normalizePhoneNumber('(071) 234-56789', ukCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+447123456789');
    });

    test('validates UK mobile must start with 7', () => {
      const result = normalizePhoneNumber('06123456789', ukCountry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('should start with 7');
    });

    test('validates UK number length', () => {
      const result = normalizePhoneNumber('0712345', ukCountry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10 digits');
    });
  });

  describe('US Phone Numbers', () => {
    test('normalizes US number', () => {
      const result = normalizePhoneNumber('2125551234', usCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+12125551234');
    });

    test('handles US number with country code', () => {
      const result = normalizePhoneNumber('+12125551234', usCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+12125551234');
    });

    test('handles US number with formatting', () => {
      const result = normalizePhoneNumber('(212) 555-1234', usCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+12125551234');
    });

    test('validates US number length', () => {
      const result = normalizePhoneNumber('212555123', usCountry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10 digits');
    });
  });

  describe('Ireland Phone Numbers', () => {
    test('normalizes Irish mobile with leading zero', () => {
      const result = normalizePhoneNumber('0851234567', ieCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+353851234567');
    });

    test('validates Irish mobile must start with 8', () => {
      const result = normalizePhoneNumber('0751234567', ieCountry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('should start with 8');
    });

    test('handles both 9 and 10 digit Irish numbers', () => {
      const result9 = normalizePhoneNumber('085123456', ieCountry);
      expect(result9.isValid).toBe(true);
      expect(result9.normalizedNumber).toBe('+35385123456');

      const result10 = normalizePhoneNumber('0851234567', ieCountry);
      expect(result10.isValid).toBe(true);
      expect(result10.normalizedNumber).toBe('+353851234567');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty phone number', () => {
      const result = normalizePhoneNumber('', ukCountry);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('handles only spaces', () => {
      const result = normalizePhoneNumber('   ', ukCountry);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('handles duplicate country code in input', () => {
      const result = normalizePhoneNumber('+44447123456789', ukCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+447123456789');
    });

    test('removes multiple leading zeros', () => {
      const result = normalizePhoneNumber('00447123456789', ukCountry);
      expect(result.isValid).toBe(true);
      expect(result.normalizedNumber).toBe('+447123456789');
    });
  });

  describe('getPhoneNumberError', () => {
    test('returns null for empty input', () => {
      const error = getPhoneNumberError('', ukCountry);
      expect(error).toBeNull();
    });

    test('returns null for valid number', () => {
      const error = getPhoneNumberError('07123456789', ukCountry);
      expect(error).toBeNull();
    });

    test('returns error for invalid number', () => {
      const error = getPhoneNumberError('123', ukCountry);
      expect(error).toContain('10 digits');
    });

    test('returns error for wrong prefix', () => {
      const error = getPhoneNumberError('06123456789', ukCountry);
      expect(error).toContain('should start with 7');
    });
  });

  describe('cleanPhoneNumber', () => {
    test('removes spaces, dashes, and parentheses', () => {
      expect(cleanPhoneNumber('(123) 456-7890')).toBe('1234567890');
      expect(cleanPhoneNumber('+44 7123 456 789')).toBe('447123456789');
      expect(cleanPhoneNumber('123-456-7890')).toBe('1234567890');
    });
  });
});