import type { Metadata } from "next";
import { Saira_Condensed, EB_Garamond, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// The typographic trinity, translated to open-source faces:
//   display  → Saira Condensed  (engineered, uppercase, wide-tracked headlines)
//   serif    → EB Garamond      (literary, slow-reading body — the synopsis voice)
//   mono     → JetBrains Mono    (machined captions, labels, buttons)
const display = Saira_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-display",
});

const serif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Blank Meets Blank",
  description:
    "An idea engine for original cinema. Two films in, one new movie out.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
