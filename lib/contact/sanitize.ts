export function sanitizeText(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultilineText(value: unknown, maxLength = 5000): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: unknown): string {
  return sanitizeText(value, 320).toLowerCase();
}

export function sanitizePhone(value: unknown): string {
  const sanitizedValue = sanitizeText(value, 32);
  return sanitizedValue.replace(/[^\d+\-()\s]/g, '');
}

export function sanitizeUrl(value: unknown): string {
  return sanitizeText(value, 2048);
}

export function sanitizeIpAddress(value: unknown): string {
  return sanitizeText(value, 128).replace(/[^a-fA-F0-9:.,\s]/g, '');
}
