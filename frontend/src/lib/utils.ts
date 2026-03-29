import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shorten a UUID for use in data-testid attributes.
 * "10000000-0000-0000-0000-000000000025" → "25"
 * "a1b2c3d4-e5f6-7890-abcd-ef1234567890" → "7890"
 * Strips leading zeros from the last segment for cleaner IDs.
 */
export function tid(uuid: string): string {
  const last = uuid.replace(/-/g, '').slice(-12)
  const trimmed = last.replace(/^0+/, '')
  return trimmed || '0'
}
