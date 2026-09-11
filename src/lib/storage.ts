/*
  Persistência local. Sem login no v1: o plano vive no navegador da pessoa.
  Toda leitura e escrita é protegida — navegador anônimo, cookies bloqueados
  ou SSR nunca podem quebrar a página.
*/

export const STORAGE_KEYS = {
  /** respostas do onboarding em andamento (parciais) */
  rascunho: "dindin:onboarding:v1",
  /** perfil completo e validado — fonte do plano */
  perfil: "dindin:perfil:v1",
} as const;

function disponivel(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!disponivel()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  if (!disponivel()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  if (!disponivel()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignora */
  }
}

/** Avisa quando outra aba mexe no localStorage. Devolve a função que cancela a assinatura. */
export function subscribeStorage(onChange: () => void): () => void {
  if (!disponivel()) return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
