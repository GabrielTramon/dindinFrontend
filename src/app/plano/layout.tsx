import { MotionProvider } from "@/components/motion/motion-provider";
import { ToastProvider } from "@/components/ui/toast";

/*
  Monta o MotionProvider (LazyMotion + domMax) só em /plano/**: cobre /plano e
  /plano/resultado. A home e o layout raiz ficam sem motion.

  O ToastProvider também mora aqui: os avisos da tela do resultado ("Pote
  Namoro removido. [Desfazer]", o do PDF) saem de useToast(). /entrar e /conta
  ficam fora de /plano e montam o próprio.
*/

export default function PlanoLayout({ children }: LayoutProps<"/plano">) {
  return (
    <MotionProvider>
      <ToastProvider>{children}</ToastProvider>
    </MotionProvider>
  );
}
