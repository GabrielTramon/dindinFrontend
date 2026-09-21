import type { ComponentProps, ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

/* botão-ícone de 44px com hover em accent (visível nos dois temas); `label` vira aria-label */

export function IconButton({
  label,
  icon: Icon,
  className,
  ...props
}: ComponentProps<"button"> & { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "press flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}
