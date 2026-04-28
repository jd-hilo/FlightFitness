import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Flight Coach",
  description: "Flight Fitness — coach dashboard for clients, plans, and messaging",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
