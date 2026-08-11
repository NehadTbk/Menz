const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BE_PHONE_REGEX = /^(?:\+32\s?4\d{2}|04\d{2})(?:\s?\d{2}){3}$/;
const POSTAL_CODE_REGEX = /^\d{4}$/;
const NO_DIGITS_REGEX = /^[^0-9]+$/;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value).trim());
}

function isValidBelgianPhone(value) {
  return BE_PHONE_REGEX.test(String(value).trim());
}

function isValidPostalCode(value) {
  return POSTAL_CODE_REGEX.test(String(value).trim());
}

function containsNoDigits(value) {
  return NO_DIGITS_REGEX.test(String(value).trim());
}
