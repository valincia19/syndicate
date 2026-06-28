import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
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
      <head>
        {typeof window === "undefined" && (
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        )}
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <Toaster position="top-right" richColors closeButton />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
