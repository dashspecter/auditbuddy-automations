/**
 * Phone number utilities for WhatsApp integration
 * Handles E.164 normalization, validation, and masking
 */

/**
 * Normalize a phone number to E.164 format
 * Handles Romanian formats by default
 */
export function normalizeToE164(phone: string, defaultCountryCode: string = '+40'): string {
  // Strip everything except digits and leading +
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Handle Romanian formats
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  } else if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = defaultCountryCode + cleaned.slice(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = defaultCountryCode + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate a phone number for WhatsApp usage
 */
export function validatePhoneForWhatsApp(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone || phone.trim() === '') {
    return { valid: false, normalized: '', error: 'Phone number is required' };
  }
  
  const normalized = normalizeToE164(phone);
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  
  if (!e164Regex.test(normalized)) {
    return { valid: false, normalized, error: 'Invalid phone number format. Expected E.164 format (e.g., +40712345678)' };
  }
  
  return { valid: true, normalized };
}

/**
 * Mask a phone number for display (show last 4 digits)
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 5) return phone || '';
  return '•'.repeat(phone.length - 4) + phone.slice(-4);
}
