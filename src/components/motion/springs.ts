import type { Transition, Variants } from "motion/react";

/*
  Tokens de movimento em JS (só pra /plano/**, onde o motion vive) + variants
  compartilhadas: passo do wizard, filhos em cascata e itens de lista.
*/

export const SPRING_SOFT: Transition = { type: "spring", stiffness: 300, damping: 30, mass: 1 };
export const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 520, damping: 34, mass: 0.8 };
export const SPRING_LAYOUT: Transition = { type: "spring", stiffness: 380, damping: 32 };
export const EXIT_TWEEN: Transition = { duration: 0.16, ease: [0.5, 0, 0.75, 0] };

/** passo do wizard: entra do lado da direção (custom = 1 | -1), sai pro oposto */
export const STEP: Variants = {
  enter: (d: number) => ({ opacity: 0, x: 32 * d }),
  center: {
    opacity: 1,
    x: 0,
    transition: { ...SPRING_SOFT, opacity: { duration: 0.22 }, staggerChildren: 0.06 },
  },
  exit: (d: number) => ({ opacity: 0, x: -24 * d, transition: EXIT_TWEEN }),
};

export const STEP_REDUCED: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/** filhos do passo: herdam enter/center do pai (cascata de 60ms) */
export const CHILD: Variants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0, transition: SPRING_SOFT },
};

/** item de lista (linha de gasto, cartão, item de grupo) */
export const ITEM: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: SPRING_LAYOUT },
  exit: { opacity: 0, height: 0, overflow: "hidden", transition: EXIT_TWEEN },
};
