import type { Metadata } from "next";
import { RedefinirSenha } from "@/components/conta/redefinir-senha";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ToastProvider } from "@/components/ui/toast";

/*
  /redefinir-senha#token=… — o link "Criar uma senha nova" do e-mail. O token
  mora no hash (não vai pro servidor nem pros logs); quem lê é o
  <RedefinirSenha /> (cliente). Fora de /plano: monta o próprio ToastProvider.
  noindex, e sem referrer: nada desta página vaza pra outro site.
*/

export const metadata: Metadata = {
  title: "Criar uma senha nova",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RedefinirSenhaPage() {
  return (
    <ToastProvider>
      <SiteHeader variant="minimal" />
      <PageTransition>
        <main className="flex-1 py-12 sm:py-20">
          <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
            <RedefinirSenha />
          </div>
        </main>
      </PageTransition>
    </ToastProvider>
  );
}
