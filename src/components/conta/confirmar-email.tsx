"use client";

import { ctaClasses } from "@/components/layout/cta-link";
import { reenviarConfirmacao } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ConfiraEmail, usePedidoDeLink, type PedidoDeLink } from "./form-email";

/*
  A conta só passa a valer quando a pessoa abre o link do "Confirme seu e-mail"
  (o link já entra). Aqui moram as duas peças disso:

  - ConfiraConfirmacao: o "Confira seu e-mail" depois do cadastro, no
    /criar-conta e na gaveta do PDF. "Mandar de novo" (60 s) pede outro link;
    "Usar outro e-mail" volta pro formulário.
  - ReenviarConfirmacao: o botão "Mandar o link de novo" de quem tentou entrar
    antes de confirmar (403 EMAIL_NAO_CONFIRMADO) e da /conta de uma conta
    antiga, de antes da regra, que ainda não confirmou.
*/

/** o pedido do "Mandar de novo" da confirmação: o mesmo hook do Esqueci a senha, com o outro POST */
export function usePedidoDeConfirmacao(): PedidoDeLink {
  return usePedidoDeLink(undefined, reenviarConfirmacao);
}

function relogio(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

interface ConfiraConfirmacaoProps {
  pedido: PedidoDeLink;
  /** o que acontece depois do clique no link ("e o PDF libera aqui") */
  depois?: string;
}

export function ConfiraConfirmacao({ pedido, depois = "e você já entra" }: ConfiraConfirmacaoProps) {
  return (
    <ConfiraEmail
      pedido={pedido}
      dica="Não chegou? Olhe o spam e a aba de promoções. O link vale por 48 horas e funciona uma vez só."
    >
      Mandamos um link pra <strong className="font-bold break-all text-foreground">{pedido.email}</strong>. Abra o
      e-mail e toque em “Confirmar meu e-mail”: a conta passa a valer {depois}.
    </ConfiraEmail>
  );
}

interface ReenviarConfirmacaoProps {
  email: string;
  className?: string;
}

/** "Mandar o link de novo", com a espera de 60 s e a frase do que aconteceu. */
export function ReenviarConfirmacao({ email, className }: ReenviarConfirmacaoProps) {
  const pedido = usePedidoDeConfirmacao();
  const falta = pedido.segundosParaReenviar;
  const jaPediu = pedido.fase === "enviado";

  return (
    <div className={cn("grid gap-2", className)}>
      <button
        type="button"
        disabled={falta > 0 || pedido.enviando}
        onClick={() => void (jaPediu ? pedido.reenviar() : pedido.enviar(email))}
        className={cn(ctaClasses("secondary"), "justify-self-start tnum")}
      >
        {pedido.enviando
          ? "Mandando…"
          : falta > 0
            ? `Mandar de novo em ${relogio(falta)}`
            : jaPediu
              ? "Mandar de novo"
              : "Mandar o link de novo"}
      </button>
      {/* a região viva existe desde o começo (senão o leitor de tela não anuncia); vazia, sai do fluxo.
          Dentro de 60 s do último link a API não manda outro (vale o que já foi): a frase serve pros dois casos */}
      <p role="status" className={jaPediu && !pedido.erro ? "text-sm font-semibold text-pretty" : "sr-only"}>
        {jaPediu && !pedido.erro
          ? `Confira a caixa de entrada e o spam de ${pedido.email}: o link pra confirmar já está lá ou chega em instantes.`
          : ""}
      </p>
      {pedido.erro && (
        <p role="alert" className="text-sm font-semibold text-pretty text-warn">
          {pedido.erro}
        </p>
      )}
    </div>
  );
}
