import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/context/auth-context";
import { LanguageProvider } from "@/components/providers/language-provider";
import { CookieConsent } from "@/components/shared/cookie-consent";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfitHeading = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://valincsyndicate.com"),
  title: {
    default: "VALINC SYNDICATE - Roblox Scripting, Refined",
    template: "%s | VALINC SYNDICATE",
  },
  description:
    "Advanced LUA execution, undetected anti-cheat bypasses, and secure account synchronization for Roblox.",
  keywords: [
    "VALINC SYNDICATE",
    "Roblox scripting",
    "LUA execution",
    "Byfron bypass",
    "Hyperion bypass",
    "Roblox exploit",
    "script hub",
    "keyless Roblox",
    "Synapse Z",
    "Wave executor",
    "Roblox undetected",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "VALINC SYNDICATE",
    title: "VALINC SYNDICATE - Roblox Scripting, Refined",
    description:
      "Advanced LUA execution, undetected anti-cheat bypasses, and secure account synchronization.",
    url: "https://valincsyndicate.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "VALINC SYNDICATE - Roblox Scripting, Refined",
    description:
      "Advanced LUA execution, undetected anti-cheat bypasses, and secure account synchronization.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://valincsyndicate.com",
  },
};

// Official Next.js pattern: inline script runs before React hydration
// to prevent theme flash. Reads localStorage and sets dark class on <html>.
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = t || (prefersDark ? "dark" : "light");
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch(e) {}
})()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${outfitHeading.variable} font-sans`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "VALINC SYNDICATE",
              url: "https://valincsyndicate.com",
              description:
                "Roblox scripting platform offering premium LUA execution with undetected Byfron/Hyperion anti-cheat bypass.",
              foundingDate: "2022",
              numberOfEmployees: { value: 3 },
              founder: [
                { "@type": "Person", name: "Valincia Eunha" },
                { "@type": "Person", name: "Sykoerzzz" },
                { "@type": "Person", name: "Choco" },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "VALINC SYNDICATE",
              url: "https://valincsyndicate.com",
              description:
                "Advanced LUA execution, undetected anti-cheat bypasses, and secure account synchronization.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://valincsyndicate.com/?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="group/body bg-background text-foreground overscroll-none font-sans antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <Toaster position="top-right" richColors closeButton />
            <CookieConsent />
            <ErrorBoundary>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ErrorBoundary>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
