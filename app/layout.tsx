import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VA Benefits Finder",
  description: "Find the state and local veteran benefits available to you."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
