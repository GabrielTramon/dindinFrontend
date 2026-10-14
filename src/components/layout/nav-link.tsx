"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LINK_DO_HEADER } from "./header-estilos";

/*
  Link de página na linha do cabeçalho (desktop). Na própria página,
  aria-current="page" e o traço esmeralda fica.

  Âncora de seção ("/#como-funciona") sai como <a> nativo, não next/link: na
  home o Link ignora o clique quando o hash já está na URL (a página não rola
  de novo). De outra página, o navegador abre a home já na seção.
*/

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function NavLink({ href, children, className }: NavLinkProps) {
  const pathname = usePathname();
  const classes = cn(LINK_DO_HEADER, className);

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
