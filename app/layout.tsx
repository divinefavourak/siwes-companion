import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIWES Companion",
  description: "Document your SIWES. Understand your experience. Defend it confidently.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
