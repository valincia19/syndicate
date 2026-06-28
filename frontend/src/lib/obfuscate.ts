/**
 * Safe Base64 encoding/decoding helper for Local Storage Obfuscation.
 * Handles Unicode (utf-8) strings correctly.
 */
export const obfuscate = (str: string): string => {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16))
      })
    )
  } catch {
    return str
  }
}

export const deobfuscate = (str: string): string => {
  try {
    // If the string is not valid Base64, atob will throw and we fallback to original string
    return decodeURIComponent(
      atob(str)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join("")
    )
  } catch {
    return str
  }
}
