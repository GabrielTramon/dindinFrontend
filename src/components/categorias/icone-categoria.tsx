import {
  BookOpen,
  Brain,
  Building2,
  Bus,
  Car,
  CreditCard,
  Droplets,
  Dumbbell,
  Flame,
  Fuel,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  PawPrint,
  Pill,
  School,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Tag,
  Tv,
  Wifi,
  Zap,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { ICONE_PADRAO } from "@/domain";
import { cn } from "@/lib/utils";

/*
  Traduz o nome do ícone que vem do catálogo (categorias.ts, e do banco mais
  tarde) no componente do lucide. O mapa é explícito de propósito: importar a
  biblioteca inteira ou resolver por índice dinâmico levaria todos os ícones
  pro bundle.

  Ícone desconhecido — categoria criada pela pessoa, ou catálogo mais novo que
  o app — cai no padrão em vez de sumir.
*/

type Icone = ComponentType<SVGProps<SVGSVGElement>>;

const MAPA: Record<string, Icone> = {
  BookOpen,
  Brain,
  Building2,
  Bus,
  Car,
  CreditCard,
  Droplets,
  Dumbbell,
  Flame,
  Fuel,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  PawPrint,
  Pill,
  School,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Tag,
  Tv,
  Wifi,
  Zap,
};

interface IconeCategoriaProps {
  /** nome do componente no lucide, vindo do catálogo */
  icone: string;
  className?: string;
}

export function IconeCategoria({ icone, className }: IconeCategoriaProps) {
  const Componente = MAPA[icone] ?? MAPA[ICONE_PADRAO];
  return <Componente aria-hidden="true" className={cn("size-5 shrink-0", className)} />;
}
