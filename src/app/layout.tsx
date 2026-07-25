import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SiteHeader } from "@/components/web/site-header";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Seam",
  description: "Sealed two-party negotiation — one line, no leaks. ETHGlobal Lisbon 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${interTight.variable} ${instrumentSerif.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* The header owns its height and the page takes the rest (S3.10). Pages
              use `flex-1` rather than `min-h-dvh`, which would otherwise add the
              header's height to a full viewport and push every centred screen
              off-centre with a scrollbar it does not need. */}
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
