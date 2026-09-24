import type { Metadata } from "next";
import { Conta } from "@/components/conta/conta";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ToastProvider } from "@/components/ui/toast";

/*
  /conta — e-mail (confirmado ou não), desde quando, senha, sair, baixar e
  excluir os dados. A sessão mora
  no navegador, então quem decide o que mostrar é o <Conta /> (cliente).
  Fora de /plano: monta o próprio ToastProvider. noindex.
*/

export const metadata: Metadata = {
  title: "Sua conta",
  robots: { index: false, follow: false },
};

export default function ContaPage() {
  return (
    <ToastProvider>
      <SiteHeader variant="minimal" />
      <PageTransition>
        <main className="flex-1 py-12 sm:py-20">
          <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
            <Conta />
          </div>
        </main>
      </PageTransition>
    </ToastProvider>
  );
}
