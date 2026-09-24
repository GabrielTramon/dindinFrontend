"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type KeyboardEvent, type Ref } from "react";
import { cn } from "@/lib/utils";
import { SENHA_MAXIMO } from "./validacao";

/*
  Campo de senha com a caixa do TextField (md) e um botão de olho dentro dela.

  - `autoComplete`: "new-password" pra criar/redefinir/trocar (o gerenciador de
    senhas sugere uma forte e guarda) e "current-password" pra entrar e senha atual.
  - O olho é um botão de alternância: aria-pressed diz o estado e o nome fica
    fixo ("Mostrar senha"), como pede o padrão de toggle — trocar o nome E o
    estado faria o leitor dizer "Ocultar senha, pressionado", que confunde.
    Alvo de 44px. No mouse/toque, o clique não tira o foco do campo (o teclado
    do celular não fecha no meio da digitação).
  - maxLength 128 (o teto do servidor) e colar liberado: gerenciador de senha
    cola, e bloquear colar só empurra senha fraca.
  - Dica e erro ficam ligados por aria-describedby; o erro pinta a caixa
    (aria-invalid, como o TextField). Caps Lock ligado ganha um aviso curto.
*/

interface CampoSenhaProps {
  id: string;
  label: string;
  autoComplete: "new-password" | "current-password";
  value: string;
  onChange: (valor: string) => void;
  /** frase de erro (pinta a caixa e entra no aria-describedby) */
  erro?: string | null;
  /** id de um erro que mora FORA do campo (ex.: "E-mail ou senha incorretos." do formulário) */
  erroExternoId?: string;
  /** dica fixa embaixo ("Pelo menos 8 caracteres"), ligada por aria-describedby */
  dica?: string;
  name?: string;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

export function CampoSenha({
  id,
  label,
  autoComplete,
  value,
  onChange,
  erro,
  erroExternoId,
  dica,
  name,
  inputRef,
  className,
}: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const idCaps = `${id}-caps`;

  const descritoPor = [dica ? idDica : null, erro ? idErro : null, erroExternoId ?? null, capsLock ? idCaps : null]
    .filter(Boolean)
    .join(" ");

  function lerCapsLock(evento: KeyboardEvent<HTMLInputElement>) {
    // getModifierState não existe em todo teclado virtual: sem ele, sem aviso
    const ligado = typeof evento.getModifierState === "function" && evento.getModifierState("CapsLock");
    if (ligado !== capsLock) setCapsLock(ligado);
  }

  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <div
        className={cn(
          "flex h-14 min-w-0 items-center gap-1 rounded-2xl border border-input bg-card pr-1.5 pl-5",
          "transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo motion-reduce:transition-none",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          "has-aria-invalid:border-warn has-aria-invalid:focus-within:ring-warn",
        )}
      >
        <input
          id={id}
          ref={inputRef}
          type={visivel ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={SENHA_MAXIMO}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={lerCapsLock}
          onKeyUp={lerCapsLock}
          onBlur={() => setCapsLock(false)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritoPor || undefined}
          className="w-0 min-w-0 flex-1 bg-transparent text-lg font-bold text-foreground outline-none placeholder:font-normal placeholder:text-ink-3"
        />
        <button
          type="button"
          aria-label="Mostrar senha"
          aria-pressed={visivel}
          aria-controls={id}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisivel((v) => !v)}
          className="press flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card aria-pressed:text-primary"
        >
          {visivel ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      </div>
      {dica && (
        <p id={idDica} className="text-sm text-ink-2">
          {dica}
        </p>
      )}
      {capsLock && (
        <p id={idCaps} className="text-sm font-semibold text-ink-2">
          Caps Lock ligado.
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-sm font-semibold text-pretty text-warn">
          {erro}
        </p>
      )}
    </div>
  );
}
