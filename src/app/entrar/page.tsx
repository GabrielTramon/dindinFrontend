import type { Metadata } from "next";
import { Entrar } from "@/components/conta/entrar";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ToastProvider } from "@/components/ui/toast";

/*
  /entrar — e-mail e senha. Também abre o link "Confirme seu e-mail" que o
  cadastro manda (/entrar#token=…). A página só monta a moldura; os estados
  moram no <Entrar /> (cliente), que lê o hash. Fora de /plano: monta o próprio
  ToastProvider. noindex: não é página de busca.
*/

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function EntrarPage() {
  return (
    <ToastProvider>
      <SiteHeader variant="minimal" />
      <PageTransition>
        <main className="flex-1 py-12 sm:py-20">
          <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
            <Entrar />
          </div>
        </main>
      </PageTransition>
    </ToastProvider>
  );
}
