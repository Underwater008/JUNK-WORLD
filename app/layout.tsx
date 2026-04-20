import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
});

const metadataBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: "JUNK",
  description: "A global showcase of university worlds and design projects",
  openGraph: {
    title: "JUNK",
    description: "A global showcase of university worlds and design projects",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JUNK",
    description: "A global showcase of university worlds and design projects",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${inter.className}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
