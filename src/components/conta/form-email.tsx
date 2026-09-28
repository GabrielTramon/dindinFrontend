"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { TextField } from "@/components/ui/text-field";
import { esqueciSenha } from "@/lib/api";
import { cn } from "@/lib/utils";
import { erroDoEmail, mensagemDeErro } from "./validacao";

/*
  O formulário de um campo do /esqueci-senha: a pessoa dá o e-mail e recebe o
  link "Criar uma senha nova" (POST /auth/esqueci-senha).

  O estado mora no hook (usePedidoDeLink) e não no formulário, porque quem
  mostra o "Confira seu e-mail" é o dono da tela (vira o h1).

  - Erro sempre inline, ligado por aria-describedby, e o foco volta pro campo.
  - "Mandar de novo" espera 60 s: é a regra do backend (LINK_REENVIO_SEGUNDOS);
    pedir antes disso só gastaria um toque sem mandar e-mail nenhum.
*/

/** mesma espera do backend entre dois links pro mesmo e-mail */
const ESPERA_REENVIO_S = 60;

export type FasePedido = "digitar" | "enviado";

export interface PedidoDeLink {
  fase: FasePedido;
  /** o e-mail do último pedido que deu certo (ou "" antes disso) */
  email: string;
  enviando: boolean;
  /** frase pronta pra tela, ou null */
  erro: string | null;
  /** true logo depois de um "Mandar de novo" que deu certo */
  reenviado: boolean;
  /** 0 quando já dá pra mandar de novo */
  segundosParaReenviar: number;
  enviar: (email: string) => Promise<boolean>;
  reenviar: () => Promise<void>;
  usarOutro: () => void;
  limparErro: () => void;
}

/**
 * Pede o link "Criar uma senha nova" e guarda em que pé a pessoa está.
 * `antesDeEnviar` roda antes do POST (é onde o /esqueci-senha grava o retorno
 * com o e-mail: o link abre noutra aba e é o retorno que leva de volta).
 */
export function usePedidoDeLink(antesDeEnviar?: (email: string) => void): PedidoDeLink {
  const [fase, setFase] = useState<FasePedido>("digitar");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reenviado, setReenviado] = useState(false);
  const [liberaEm, setLiberaEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(0);
  const enviandoRef = useRef(false);

  // relógio do "Mandar de novo em 0:42": só anda enquanto falta tempo
  useEffect(() => {
    if (liberaEm === null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setAgora(t);
      if (t >= liberaEm) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [liberaEm]);

  const segundosParaReenviar = liberaEm === null ? 0 : Math.max(0, Math.ceil((liberaEm - agora) / 1000));

  async function mandar(destino: string): Promise<boolean> {
    if (enviandoRef.current) return false;
    enviandoRef.current = true;
    setEnviando(true);
    setErro(null);
    try {
      antesDeEnviar?.(destino);
      await esqueciSenha(destino);
      const t = Date.now();
      setAgora(t);
      setLiberaEm(t + ESPERA_REENVIO_S * 1000);
      return true;
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      return false;
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return {
    fase,
    email,
    enviando,
    erro,
    reenviado,
    segundosParaReenviar,
    async enviar(bruto) {
      const destino = bruto.trim();
      const invalido = erroDoEmail(destino);
      if (invalido) {
        setErro(invalido);
        return false;
      }
      const ok = await mandar(destino);
      if (ok) {
        setEmail(destino);
        setReenviado(false);
        setFase("enviado");
      }
      return ok;
    },
    async reenviar() {
      if (!email || segundosParaReenviar > 0) return;
      setReenviado(false);
      const ok = await mandar(email);
      if (ok) setReenviado(true);
    },
    usarOutro() {
      setErro(null);
      setReenviado(false);
      setFase("digitar");
    },
    limparErro() {
      setErro(null);
    },
  };
}

/* ---------- o campo ---------- */

interface FormEmailProps {
  /** prefixo dos ids (campo e erro); um por tela */
  id: string;
  pedido: PedidoDeLink;
  rotuloBotao?: string;
  /** e-mail pra já vir preenchido (o que a pessoa digitou no /entrar) */
  emailInicial?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}

export function FormEmail({ id, pedido, rotuloBotao = "Mandar link", emailInicial, inputRef, className }: FormEmailProps) {
  const [valor, setValor] = useState(() => emailInicial ?? pedido.email);
  const proprioRef = useRef<HTMLInputElement | null>(null);
  const campoRef = inputRef ?? proprioRef;
  const idErro = `${id}-erro`;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const ok = await pedido.enviar(valor);
    if (!ok) campoRef.current?.focus();
  }

  return (
    <form method="post" noValidate onSubmit={enviar} className={cn("grid gap-3", className)}>
      <TextField
        id={id}
        ref={campoRef}
        label="E-mail"
        type="email"
        name="email"
        autoComplete="username"
        maxLength={320}
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="voce@email.com"
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          if (pedido.erro) pedido.limparErro();
        }}
        aria-invalid={pedido.erro ? true : undefined}
        aria-describedby={pedido.erro ? idErro : undefined}
      />
      {pedido.erro && (
        <p id={idErro} className="text-sm font-semibold text-pretty text-warn">
          {pedido.erro}
        </p>
      )}
      <button
        type="submit"
        aria-disabled={pedido.enviando || undefined}
        className={cn(ctaClasses("primary", "lg"), "w-full sm:w-auto sm:justify-self-start", pedido.enviando && "opacity-70")}
      >
        {pedido.enviando ? "Mandando…" : rotuloBotao}
      </button>
    </form>
  );
}

/* ---------- "Confira seu e-mail" ---------- */

function relogio(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface ConfiraEmailProps {
  pedido: PedidoDeLink;
  /** a frase principal ("Se ana@email.com puder entrar…"); recebe o foco ao aparecer */
  children: ReactNode;
  /** linha pequena embaixo ("Não chegou? Olhe o spam…") */
  dica?: ReactNode;
}

export function ConfiraEmail({ pedido, children, dica }: ConfiraEmailProps) {
  const mensagemRef = useRef<HTMLParagraphElement>(null);
  const falta = pedido.segundosParaReenviar;
  const bloqueado = falta > 0 || pedido.enviando;

  // o formulário sumiu: o foco vai pra frase que diz o que fazer agora
  useEffect(() => {
    mensagemRef.current?.focus();
  }, []);

  return (
    <div className="grid gap-4">
      <p ref={mensagemRef} tabIndex={-1} className="text-base text-pretty text-ink-2 outline-none">
        {children}
      </p>
      {dica && <p className="text-sm text-pretty text-muted-foreground">{dica}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={bloqueado}
          onClick={() => void pedido.reenviar()}
          className={cn(ctaClasses("secondary"), "tnum")}
        >
          {pedido.enviando ? "Mandando…" : falta > 0 ? `Mandar de novo em ${relogio(falta)}` : "Mandar de novo"}
        </button>
        <button type="button" onClick={pedido.usarOutro} className={ctaClasses("ghost")}>
          Usar outro e-mail
        </button>
      </div>
      {/* a região viva existe desde o começo (senão o leitor de tela não anuncia); vazia, sai do fluxo */}
      <p role="status" className={pedido.reenviado ? "text-sm font-semibold text-pretty" : "sr-only"}>
        {pedido.reenviado ? "Mandamos de novo. Confira a caixa de entrada e o spam." : ""}
      </p>
      {pedido.erro && (
        <p role="alert" className="text-sm font-semibold text-pretty text-warn">
          {pedido.erro}
        </p>
      )}
    </div>
  );
}
