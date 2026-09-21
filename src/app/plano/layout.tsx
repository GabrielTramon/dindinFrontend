import { MotionProvider } from "@/components/motion/motion-provider";

/*
  Monta o MotionProvider (LazyMotion + domMax) só em /plano/**: cobre /plano e
  /plano/resultado. A home e o layout raiz ficam sem motion.
*/

export default function PlanoLayout({ children }: LayoutProps<"/plano">) {
  return <MotionProvider>{children}</MotionProvider>;
}
