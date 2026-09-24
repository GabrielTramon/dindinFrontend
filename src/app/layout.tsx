import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { SpotlightTracker } from "@/components/motion/spotlight-tracker";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3700";

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

// o único lugar com hex fora do globals.css: são os --background dos dois temas
// (a barra do navegador); use-theme reescreve as duas metas na troca de tema.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0a100d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning só aqui: o ThemeScript muda className (js/dark)
    // antes da hidratação. Sem MotionProvider no raiz — ele mora em plano/layout.
    // data-scroll-behavior: o smooth do globals.css vale só pras âncoras; o Next
    // desliga durante a troca de rota, e a página nova abre direto no topo.
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${nunito.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <SpotlightTracker />
      </body>
    </html>
  );
}
