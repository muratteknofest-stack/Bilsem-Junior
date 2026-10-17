const STUDENT_EMAIL_DOMAIN = 'zekapark.com';

function normalizeAsciiAlphanumeric(value: string): string {
  return value
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'I')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

export function normalizeStudentCodeBase(name: string): string {
  const normalized = normalizeAsciiAlphanumeric(name).slice(0, 10);

  return normalized || 'OGRENCI';
}

export function createStudentCode(name: string): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  const suffix = String(100000 + (values[0] % 900000));
  return `${normalizeStudentCodeBase(name)}${suffix}`;
}

export function normalizeStudentCodeInput(value: string): string {
  return normalizeAsciiAlphanumeric(value.trim());
}

export function studentCodeToEmail(code: string): string {
  return `${normalizeStudentCodeInput(code).toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}

export function isManagedStudentEmail(email: string | null | undefined): boolean {
  return Boolean(email?.trim().toLowerCase().endsWith(`@${STUDENT_EMAIL_DOMAIN}`));
}
