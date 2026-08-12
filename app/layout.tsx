import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://area-mail.openai.site"),
  title: "Area Mail — Automatización inmobiliaria",
  description:
    "Panel central de automatizaciones de correo para Area Prime, Area Retail y Area Hub.",
  openGraph: {
    title: "Area Mail",
    description: "Automatización inmobiliaria, en un solo lugar.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Area Mail",
    description: "Automatización inmobiliaria, en un solo lugar.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
