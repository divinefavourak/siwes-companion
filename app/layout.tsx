import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIWES Companion",
  description: "Document your SIWES. Understand your experience. Defend it confidently.",
  icons: {
    icon: "/r2rlogo.png",
    apple: "/r2rlogo.png"
  },
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
