import type { Metadata, Viewport } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { AppShell } from "@/components/AppShell";
import { DBProvider } from "@/components/DBProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "NomadNote — Private Travel Planner",
  description: "A local-first, privacy-first travel planner. No account needed. Your data stays on your device.",
  keywords: ["travel planner", "trip planner", "itinerary", "local first", "private"],
  openGraph: {
    title: "NomadNote",
    description: "Plan trips beautifully — no account, no tracking, 100% private.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#c8582f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NomadNote" />
      </head>
      <body>
        <ServiceWorkerRegister />
        <DBProvider>
          <AppShell>{children}</AppShell>
        </DBProvider>
      </body>
    </html>
  );
}
