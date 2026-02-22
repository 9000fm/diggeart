import type { Metadata } from "next";
import { Space_Mono, Rubik_Broken_Fax } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"] });
const rubikBrokenFax = Rubik_Broken_Fax({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "digeart — music discovery",
  description: "Music discovery for diggers & curators. Spotify + YouTube.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.className} ${rubikBrokenFax.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
