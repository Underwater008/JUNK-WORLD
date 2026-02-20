import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "JUNK",
  description: "A global showcase of university design projects",
  openGraph: {
    title: "JUNK",
    description: "A global showcase of university design projects",
    images: [
      {
        url: "/images/JUNK logos/JUNK-logo.gif",
        alt: "JUNK logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JUNK",
    description: "A global showcase of university design projects",
    images: ["/images/JUNK logos/JUNK-logo.gif"],
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
