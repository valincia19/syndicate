import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarUrl(avatar: string | null | undefined, email?: string | null): string {
  if (!avatar) {
    if (email) {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`
    }
    return `https://api.dicebear.com/7.x/initials/svg?seed=VS`
  }

  // If it starts with http/https/data: or a slash, return it as is
  if (/^(https?:\/\/|\/|data:)/i.test(avatar)) {
    return avatar
  }

  // If it's a 32-character hex string, it's a Gravatar hash
  if (/^[a-f0-9]{32}$/i.test(avatar)) {
    return `https://www.gravatar.com/avatar/${avatar}?d=identicon`
  }

  // Otherwise, use it as seed for initials
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(avatar)}`
}
