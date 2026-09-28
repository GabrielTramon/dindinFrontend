import { CountUp } from "@/components/motion/count-up";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  Entra/Sai/Sobra único (home e resultado). Vai dentro de um <dl>. `count`
  liga o CountUp; nunca passar `format` daqui — Stat é usado em Server
  Components e o CountUp já usa formatBRL sem centavos.
*/

interface StatProps {
  label: string;
  value: number;
  nota?: string;
  tone?: "default" | "primary" | "warn";
  size?: "md" | "lg";
  count?: boolean;
  delay?: number;
  className?: string;
}

export function Stat({ label, value, nota, tone = "default", size = "md", count = false, delay = 0, className }: StatProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="eyebrow">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-extrabold tracking-tight tnum",
          size === "lg" ? "number-glow text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
          tone === "primary" && "text-primary",
          tone === "warn" && "text-warn",
        )}
      >
        {count ? <CountUp value={value} delay={delay} /> : formatBRL(value)}
      </dd>
      {nota && <dd className="mt-0.5 text-xs text-muted-foreground">{nota}</dd>}
    </div>
  );
}
