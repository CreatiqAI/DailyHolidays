import type { Metadata } from "next";
import { Dancing_Script, Manrope, Outfit } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const body = Manrope({ variable: "--font-body", subsets: ["latin"] });
const heading = Outfit({ variable: "--font-heading", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const script = Dancing_Script({ variable: "--font-script", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.legalName} | Travel Agency in Batu Caves, Selangor`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: { siteName: site.legalName, locale: "en_MY", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} ${script.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
