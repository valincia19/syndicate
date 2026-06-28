

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does the Discord Whitelist system work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For Premium members, simply link your Discord account to VALINC SYNDICATE. Our bot will automatically sync your roles and grant keyless script execution within seconds.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use the VALINC UI Library for my own script projects?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Along with our script hub, we offer a premium UI Library framework featuring fluent animations, draggable windows, and customizable notification systems for script developers.",
      },
    },
    {
      "@type": "Question",
      name: "Which Roblox executors are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "VALINC SYNDICATE is fully optimized for top-tier Level 7/8 execution engines including Synapse Z, Wave, Wave Lite, Solara, Celery, and Macsploit.",
      },
    },
    {
      "@type": "Question",
      name: "Is the platform safe and undetected?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Our development team monitors Roblox's Byfron/Hyperion anti-cheat updates in real-time to keep both our execution methods and UI library completely undetected.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Free Pass and Premium?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free users can run basic scripts with a 24-hour key generated via shortlinks. Premium users enjoy a 100% ad-free (keyless) experience, all premium scripts, and advanced UI library features.",
      },
    },
    {
      "@type": "Question",
      name: "How fast are script updates pushed after a Roblox patch?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our Cloud CDN pushes patches instantly. When a game updates, our developers release fixes within minutes, without requiring any manual re-downloads from your end.",
      },
    },
  ],
}

/**
 * Marketing Layout - public-facing pages (landing, pricing, etc.)
 * No auth required. Provides i18n context for all marketing pages.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  )
}
