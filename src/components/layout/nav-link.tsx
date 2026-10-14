"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  Link da navegação do cabeçalho: texto com um traço esmeralda que cresce da
  esquerda no hover. Na própria página, aria-current="page" e o traço fica.

  Âncora de seção ("/#como-funciona") sai como <a> nativo, não next/link: na
  home o Link ignora o clique quando o hash já está na URL (a página não rola
  de novo). De outra página, o navegador abre a home já na seção.
*/

const NAV_LINK =
  "press relative min-h-11 items-center rounded-full px-3 text-sm font-bold whitespace-nowrap text-ink-2 outline-none after:absolute after:inset-x-3 after:bottom-2.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-[scale] after:duration-(--duration-base) after:ease-out-expo hover:text-foreground hover:after:scale-x-100 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[current=page]:text-foreground aria-[current=page]:after:scale-x-100 motion-reduce:after:transition-none";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  /** inclui o display (ex.: "hidden md:inline-flex") */
  className?: string;
}

export function NavLink({ href, children, className = "inline-flex" }: NavLinkProps) {
  const pathname = usePathname();
  const classes = cn(NAV_LINK, className);

  if (href.includes("#")) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} aria-current={pathname === href ? "page" : undefined} className={classes}>
      {children}
    </Link>
  );
}
