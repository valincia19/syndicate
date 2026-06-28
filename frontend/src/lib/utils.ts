import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar || avatar === "null" || avatar === "undefined") {
    return null
  }

  // If it starts with http/https/data: or a slash, return it as is (real custom avatar)
  if (/^(https?:\/\/|\/|data:)/i.test(avatar)) {
    return avatar
  }

  // If it's a 32-character hex string (email MD5 hash), treat as having no real avatar
  // returning null will force fallback to initials/default text
  return null
}
