import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ISR diário pra todas as rotas: as páginas são estáticas e o rodapé calcula o
// ano no render — sem isso o "© ano" fica congelado no build até o próximo deploy.
export const revalidate = 86400;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "dindin — seu dinheiro com um plano",
    template: "%s · dindin",
  },
  description:
    "Responda 9 perguntas e receba em 2 minutos um plano claro do que fazer com o seu salário: o que pagar primeiro, quanto guardar e quanto sobra pra você. Grátis, sem cadastro.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "dindin",
    title: "dindin — seu dinheiro com um plano",
    description:
      "9 perguntas, 2 minutos, um plano claro do que fazer com o seu salário este mês. Grátis, sem cadastro.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0d6b4c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
