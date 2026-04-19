import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { NeonAuthProvider } from "@/components/providers/neon-auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { PWARegister } from "@/components/pwa-register";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.cifrashub.com.br",
  ),
  title: {
    default: "CifrasHub",
    template: "%s — CifrasHub",
  },
  description:
    "Visualizador de cifras com pastas, transposição, metrônomo, afinador e ferramentas de palco.",
  keywords: ["cifras", "acordes", "cifras de música", "transposição", "violao", "guitarra", "baixo", "teclado"],
  authors: [{ name: "CifrasHub" }],
  creator: "CifrasHub",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "CifrasHub",
    title: "CifrasHub — Cifras para Todos os Instrumentos",
    description:
      "Visualize cifras com transposição, capotraste, modo palco e ferramentas de show.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CifrasHub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CifrasHub",
    description: "Cifras com transposição, metrônomo e modo palco.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "CifrasHub",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`dark ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NeonAuthProvider>
          <PWARegister />
          <TooltipProvider>
            <div className="flex min-h-full flex-1 flex-col">
              <div className="flex-1">{children}</div>
              <SiteFooter />
            </div>
          </TooltipProvider>
          <Toaster
            position="bottom-center"
            richColors
            closeButton
            toastOptions={{ classNames: { toast: "font-sans" } }}
          />
        </NeonAuthProvider>
      </body>
    </html>
  );
}
