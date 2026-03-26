import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reactor - Helios Film Director",
  description: "A video editor-style demo for the Helios model",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
