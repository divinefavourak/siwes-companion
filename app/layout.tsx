import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://swcompanion.akanbi.dev"),
  title: "SIWES Companion",
  description: "Document your SIWES. Understand your experience. Defend it confidently.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  },
  openGraph: {
    type: "website",
    url: "https://swcompanion.akanbi.dev",
    title: "SIWES Companion",
    description: "Document your SIWES. Understand your experience. Defend it confidently.",
    siteName: "SIWES Companion",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "SIWES Companion logo" }]
  },
  twitter: {
    card: "summary",
    title: "SIWES Companion",
    description: "Document your SIWES. Understand your experience. Defend it confidently.",
    images: ["/logo.png"]
  },
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
