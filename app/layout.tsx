import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('area-mail-theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
