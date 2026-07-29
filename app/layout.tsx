import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { getSystemSettings } from "@/lib/settings";
import { deriveBrandShades } from "@/lib/colors";
import { BrandProvider } from "@/components/brand-provider";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettings();
  return {
    title: `${settings.app_name} — Automação de Instagram`,
    description: "Comentário vira DM, automaticamente.",
    icons: settings.logo_url ? { icon: settings.logo_url } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSystemSettings();
  const shades = deriveBrandShades(settings.primary_color, settings.accent_color);

  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <style
          // sobrescreve os tokens de cor padrão com o que foi configurado
          // no super admin — mantém tudo em CSS var, sem precisar rebuild
          dangerouslySetInnerHTML={{
            __html: `:root {
              --indigo: ${shades.indigo};
              --indigo-soft: ${shades.indigoSoft};
              --signal: ${shades.signal};
              --signal-soft: ${shades.signalSoft};
              --signal-ink: ${shades.signalInk};
            }`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <BrandProvider appName={settings.app_name} logoUrl={settings.logo_url}>
          {children}
        </BrandProvider>
      </body>
    </html>
  );
}
