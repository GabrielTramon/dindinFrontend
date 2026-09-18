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
  /**
   * grupos do "como organizar o que sobra". Fica FORA do perfil de propósito:
   * o perfil é revalidado inteiro a cada render do resultado, e uma árvore de
   * grupos estranha não pode derrubar o plano da tela.
   */
  organizacao: "dindin:organizacao:v1",
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

/*
  O evento "storage" do navegador só avisa as OUTRAS abas: a aba que escreveu
  nunca o recebe. Sem este emissor próprio, uma tela que lê por
  `useSyncExternalStore(subscribeStorage, …)` não se redesenha depois da própria
  escrita — a pessoa escolhe o ritmo, o cartão marca e nenhum número muda até
  um F5. Por isso toda escrita daqui avisa os assinantes na mão.
*/
const assinantes = new Set<() => void>();

function avisar(): void {
  for (const assinante of assinantes) assinante();
}

export function writeJSON(key: string, value: unknown): boolean {
  if (!disponivel()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    avisar();
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  if (!disponivel()) return;
  try {
    window.localStorage.removeItem(key);
    avisar();
  } catch {
    /* ignora */
  }
}

/**
 * Avisa quando o localStorage muda — nesta aba (pelas funções acima) ou em
 * outra (evento do navegador). Devolve a função que cancela a assinatura.
 */
export function subscribeStorage(onChange: () => void): () => void {
  assinantes.add(onChange);
  if (!disponivel()) return () => assinantes.delete(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    assinantes.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
