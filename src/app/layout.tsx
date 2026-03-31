import type { Metadata, Viewport } from "next";
import { Space_Mono, Big_Shoulders } from "next/font/google";
import localFont from "next/font/local";
import { SessionProvider } from "next-auth/react";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"] });
const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-banner",
  adjustFontFallback: false,
});
const displayFont = localFont({
  src: "./fonts/FlexingDemoRegular.ttf",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "digeart — music discovery",
  description: "Music discovery for diggers & curators.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.className} ${displayFont.variable} ${bigShoulders.variable} antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
