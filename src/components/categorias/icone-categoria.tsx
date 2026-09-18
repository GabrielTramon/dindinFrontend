import {
  Bird,
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
  Gift,
  GraduationCap,
  Heart,
  Home,
  HeartPulse,
  House,
  Landmark,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  School,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Smile,
  Target,
  TrendingUp,
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
  Bird,
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
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  House,
  Landmark,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  School,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Smile,
  Tag,
  Target,
  TrendingUp,
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
