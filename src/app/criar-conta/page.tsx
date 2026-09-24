import type { Metadata } from "next";
import { CriarConta } from "@/components/conta/criar-conta";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ToastProvider } from "@/components/ui/toast";

/*
  /criar-conta — e-mail e senha; a pessoa já entra e volta pro retorno. A
  página só monta a moldura; os estados moram no <CriarConta /> (cliente).
  Fora de /plano: monta o próprio ToastProvider. noindex.
*/

export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false, follow: false },
};

export default function CriarContaPage() {
  return (
    <ToastProvider>
      <SiteHeader variant="minimal" />
      <PageTransition>
        <main className="flex-1 py-12 sm:py-20">
          <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
            <CriarConta />
          </div>
        </main>
      </PageTransition>
    </ToastProvider>
  );
}
