import type { Metadata } from "next";
import "./globals.css";
import "./ui-system.css";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
