import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { LanguageProvider } from "@/components/providers/language-provider";
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
  title: {
    default: "Get Free Key — VALINC SYNDICATE",
    template: "%s | VALINC SYNDICATE",
  },
  description:
    "Claim your free VALINC SYNDICATE license key. Complete simple steps to get instant access.",
  robots: {
    index: true,
    follow: true,
  },
};

// Prevent theme flash — runs before React hydration
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem("keyauth_theme");
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
      <body className="bg-background text-foreground font-sans antialiased">
        <Script
          id="keyauth-theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <Script
          src="https://pl30136189.effectivecpmnetwork.com/b6/4f/8b/b64f8bc091c7223548b32cd9ced8f7fc.js"
          strategy="afterInteractive"
        />
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-card !text-foreground !border-border !shadow-lg !rounded-xl !text-xs !font-medium",
                title: "!text-foreground !font-semibold",
                description: "!text-muted-foreground",
                error:
                  "!bg-card !text-foreground !border-border",
                success:
                  "!bg-card !text-foreground !border-border",
                warning:
                  "!bg-card !text-foreground !border-border",
                info:
                  "!bg-card !text-foreground !border-border",
                icon: "!text-foreground",
                actionButton:
                  "!bg-primary !text-primary-foreground",
                cancelButton:
                  "!bg-muted !text-muted-foreground",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
