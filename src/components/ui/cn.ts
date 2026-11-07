export type ClassValue = string | number | boolean | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const push = (val: ClassValue) => {
    if (!val) return;
    if (Array.isArray(val)) {
      for (const item of val) push(item);
    } else if (typeof val === 'string' || typeof val === 'number') {
      const trimmed = String(val).trim();
      if (trimmed) out.push(trimmed);
    }
  };
  for (const input of inputs) push(input);
  return out.join(' ');
}
