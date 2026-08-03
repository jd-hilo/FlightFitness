import type { Metadata } from "next";
import { Epilogue, Inter } from "next/font/google";

import "./globals.css";

const epilogue = Epilogue({
  subsets: ["latin"],
  variable: "--font-epilogue",
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Flight Fitness — Coaches",
  description:
    "The ultimate strength app for faith-based training. Coach clients with workouts, meals, and faith — all in Flight.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${epilogue.variable} ${inter.variable}`}>
      <body className="font-body antialiased bg-background text-on-background">
        {children}
      </body>
    </html>
  );
}
