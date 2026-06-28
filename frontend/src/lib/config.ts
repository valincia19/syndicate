/**
 * Centralized configuration utility for resolving dynamic API and Backend URLs.
 * Automatically handles production domain resolution (e.g. https://api.vinzhub.com)
 * when NEXT_PUBLIC_API_URL environment variable is unconfigured or defaults to localhost.
 */

export function getBackendUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL

  if (!url || url.includes("localhost")) {
    if (typeof window !== "undefined") {
      const host = window.location.host
      const proto = window.location.protocol
      if (host.includes("vinzhub.com")) {
        return `${proto}//api.vinzhub.com`
      }
      return `${proto}//${host}`
    }
    return "https://api.vinzhub.com"
  }

  return url.replace(/\/+$/, '')
}
