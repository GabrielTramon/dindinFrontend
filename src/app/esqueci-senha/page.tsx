import type { Metadata } from "next";
import { EsqueciSenha } from "@/components/conta/esqueci-senha";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ToastProvider } from "@/components/ui/toast";

/*
  /esqueci-senha — o e-mail da conta → "Confira seu e-mail". O link que chega
  abre o /redefinir-senha. Fora de /plano: monta o próprio ToastProvider. noindex.
*/

export const metadata: Metadata = {
  title: "Esqueci a senha",
  robots: { index: false, follow: false },
};

export default function EsqueciSenhaPage() {
  return (
    <ToastProvider>
      <SiteHeader variant="minimal" />
      <PageTransition>
        <main className="flex-1 py-12 sm:py-20">
          <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
            <EsqueciSenha />
          </div>
        </main>
      </PageTransition>
    </ToastProvider>
  );
}
