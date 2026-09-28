"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { SPRING_SOFT } from "./springs";

/*
  LazyMotion strict + domMax lazy + MotionConfig. Montado SÓ em
  app/plano/layout.tsx: home e layout raiz ficam sem motion (CSS + View
  Transitions). Com `strict`, qualquer `motion.*` lança — use sempre `m.*`.
*/

const carregar = () => import("./features").then((x) => x.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={carregar} strict>
      <MotionConfig reducedMotion="user" transition={SPRING_SOFT}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
