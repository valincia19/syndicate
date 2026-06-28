import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
import Script from "next/script";
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
    "scriptroblox",
    "roblox script",
    "roblox scripts",
    "roblox executor",
    "roblox script executor",
    "roblox cheat",
    "roblox hack",
    "roblox exploiting",
    "exploit roblox",
    "roblox bypass",
    "Byfron Bypass",
    "Hyperion Bypass",
    "Lua Execution",
    "Roblox Script Hub",
    "script hub roblox",
    "Keyless Executor",
    "keyless roblox executor",
    "undetected roblox executor",
    "Solara alternative",
    "Wave alternative",
    "Celery alternative",
    "Blox Fruits script",
    "Pet Simulator 99 script",
    "HWID Spoofer Roblox",
    "fluxus alternative",
    "krnl alternative",
    "valinc bypass",
    "valinc syndicate script",
    "vape v4 roblox",
    "blackstrap roblox",
    "hoho hub",
    "redz hub",
    "w-azure hub",
    "pluto hub",
    "neva hub",
    "txd hub",
    "mukuro hub",
    "sonic hub",
    "arsenal script",
    "murder mystery 2 script",
    "mm2 script",
    "adopt me script",
    "jailbreak script",
    "da hood script",
    "brookhaven script",
    "blade ball script",
    "fisch script",
    "evade script",
    "doors script",
    "bee swarm simulator script",
    "shindo life script",
    "king legacy script",
    "grand piece online script",
    "gpo script",
    "solara executor",
    "wave executor",
    "celery executor",
    "synapse z executor",
    "electron executor",
    "codex executor",
    "arceus x executor",
    "delta executor",
    "hydrogen executor",
    "scriptblox",
    "v3rmillion roblox",
    "roblox exploits",
  ],
  authors: [{ name: "VALINC SYNDICATE Team" }],
  creator: "VALINC SYNDICATE",
  publisher: "VALINC SYNDICATE",
  icons: {
    icon: "/ai-logo.png",
    shortcut: "/ai-logo.png",
    apple: "/ai-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://valincsyndicate.com",
    siteName: "VALINC SYNDICATE",
    title: "VALINC SYNDICATE - Next-Gen Roblox Scripting Engine",
    description:
      "Lightweight Roblox executor with zero lag, instant Lua injection, undetected Byfron bypass, and keyless Discord whitelist.",
    images: [
      {
        url: "/templates/ai-icons-1.jpg",
        width: 1920,
        height: 1080,
        alt: "VALINC SYNDICATE Engine Showcase",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VALINC SYNDICATE - Next-Gen Roblox Scripting Engine",
    description:
      "Lightweight Roblox executor with zero lag, instant Lua injection, and undetected Byfron bypass.",
    images: ["/templates/ai-icons-1.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const themeScript = `
(function() {
  try {
    var storedTheme = localStorage.getItem("theme");
    var theme = storedTheme || "dark";
    if (theme === "dark" || (!storedTheme && true)) {
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
      <body className="group/body bg-background text-foreground overscroll-none font-sans antialiased">
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <Script
          id="ld-json-org"
          type="application/ld+json"
          strategy="afterInteractive"
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
        <Script
          id="ld-json-website"
          type="application/ld+json"
          strategy="afterInteractive"
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
