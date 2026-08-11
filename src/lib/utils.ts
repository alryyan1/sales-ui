import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a random SKU code
 * @param prefix - Optional prefix for the SKU (e.g., "PROD")
 * @param length - Length of the random part (default: 8)
 * @returns A random SKU string
 */
export function generateRandomSKU(prefix: string = "", length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = prefix;

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Picks the display name for a bilingual entity (Category, Unit, ...) based on
 * the current app language, falling back to the Arabic `name` when no
 * `name_en` has been set.
 */
export function getLocalizedName(
  entity: { name: string; name_en?: string | null } | null | undefined,
  language: string
): string {
  if (!entity) return "";
  if (language === "en" && entity.name_en) return entity.name_en;
  return entity.name;
}
