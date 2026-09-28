"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { readJSON, STORAGE_KEYS, subscribeStorage, writeJSON } from "@/lib/storage";

/*
  Tema claro/escuro. A fonte visual é a classe `dark` no <html> (posta pelo
  script inline antes da pintura e reaplicada aqui). A preferência mora em
  STORAGE_KEYS.tema via @/lib/storage; ausente = "system" e o hook segue
  prefers-color-scheme ao vivo até o primeiro clique.
*/

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

function lerPreferencia(): ThemePreference {
  const v = readJSON<unknown>(STORAGE_KEYS.tema, "system");
  return v === "light" || v === "dark" ? v : "system";
}

const noServidor = (): ThemePreference => "system";

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeStorage, lerPreferencia, noServidor);
}

const temaDoSistema = (): Theme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const temaAtual = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

/** copia o --background atual pros dois <meta name="theme-color"> */
export function syncThemeColorMeta(): void {
  const cor = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
  if (!cor) return;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = cor;
  });
}

/**
 * Aplica o tema com a nova pintura abrindo em círculo a partir de `origem`
 * (startViewTransition). Sem suporte: crossfade curto das cores. Em
 * reduced-motion: troca seca. Sempre grava a preferência.
 */
export async function applyTheme(proximo: Theme, origem?: { x: number; y: number }): Promise<void> {
  const html = document.documentElement;
  const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const aplicar = () => {
    html.classList.toggle("dark", proximo === "dark");
    syncThemeColorMeta();
    writeJSON(STORAGE_KEYS.tema, proximo);
  };
  if (reduz || typeof document.startViewTransition !== "function") {
    if (!reduz) html.classList.add("theme-fallback");
    aplicar();
    if (!reduz) window.setTimeout(() => html.classList.remove("theme-fallback"), 300);
    return;
  }
  const x = origem?.x ?? window.innerWidth / 2;
  const y = origem?.y ?? 0;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  html.style.setProperty("--vt-x", `${x}px`);
  html.style.setProperty("--vt-y", `${y}px`);
  html.style.setProperty("--vt-r", `${r}px`);
  html.classList.add("theme-switching");
  // gravar DENTRO do callback: o snapshot antigo já foi capturado
  const vt = document.startViewTransition(aplicar);
  try {
    await vt.finished;
  } finally {
    html.classList.remove("theme-switching");
    for (const p of ["--vt-x", "--vt-y", "--vt-r"]) html.style.removeProperty(p);
  }
}

/**
 * Mantém o <html> coerente com a preferência: reaplica a classe (esta aba,
 * outras abas, remount do Strict Mode em dev — que limpa os atributos do
 * <html>), sincroniza as metas e, enquanto for "system", segue o sistema.
 */
export function useThemeSync(): void {
  const pref = useThemePreference();
  useLayoutEffect(() => {
    document.documentElement.classList.add("js");
    const p = lerPreferencia(); // NÃO usar `pref`: na hidratação ele é "system"
    document.documentElement.classList.toggle("dark", (p === "system" ? temaDoSistema() : p) === "dark");
    syncThemeColorMeta();
  }, [pref]);
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const seguir = () => {
      document.documentElement.classList.toggle("dark", mq.matches);
      syncThemeColorMeta();
    };
    mq.addEventListener("change", seguir);
    return () => mq.removeEventListener("change", seguir);
  }, [pref]);
}
