import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
  Barra segmentada com trilho, separador de 2px (bar-gap: a adjacência crua
  primary/chart-3 não tem contraste), crescimento da esquerda e uma luz que
  atravessa uma vez (enter). Com `label` vira role=img; sem, é decorativa.
  `Marcador` é a bolinha da legenda.
*/

export interface Segment {
  value: number;
  className: string;
}

interface SegmentBarProps {
  segments: Segment[];
  rest?: Segment;
  height?: "sm" | "md";
  enter?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function SegmentBar({ segments, rest, height = "md", enter = false, label, className, style }: SegmentBarProps) {
  // segmento zerado não entra: senão ele ainda ocupa um separador de 2px na barra
  const todos = (rest ? [...segments, rest] : segments).filter((s) => s.value > 0);
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={style}
      className={cn(
        "flex gap-0.5 overflow-hidden rounded-full bg-bar-gap",
        height === "sm" ? "h-1.5" : "h-2",
        enter && "grow-in-x bar-shine",
        className,
      )}
    >
      {todos.map((s, i) => (
        <span
          key={i}
          className={cn(
            "min-w-0 basis-0 transition-[flex-grow] duration-(--duration-slow) ease-out-expo motion-reduce:transition-none",
            s.className,
          )}
          style={{ flexGrow: Math.max(0, s.value) }}
        />
      ))}
    </div>
  );
}

export function Marcador({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2.5 rounded-full align-middle", className)} />;
}
