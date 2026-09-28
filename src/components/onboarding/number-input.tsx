"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

/*
  Campo numérico grande, do tamanho da pergunta. Só dígitos entram; quem decide
  como mostrar e como ler o texto é quem usa (reais, anos…). O texto é derivado
  do valor, então chips e slider nunca desalinham. A única exceção é o
  `rascunho`: enquanto a pessoa digita algo que a máscara não mostra (a vírgula
  dos centavos no campo inteiro), esse texto fica na tela — só enquanto ler ele
  ainda der o valor atual, e só até sair do campo.

  A máscara troca o texto a cada tecla, e o navegador jogaria o cursor pro fim:
  depois de cada edição o cursor volta pro lugar contando os dígitos à direita
  dele. Apagar um separador (Backspace depois do ponto, Delete antes dele) apaga
  o dígito vizinho — senão a tecla não faria nada, porque a máscara devolve o ponto.

  Tamanhos: lg/md têm caixa própria (borda, anel de foco); sm é nu — quem dá
  o foco é a linha que o contém. `flashKey`: mude o número e a caixa pisca um
  anel esmeralda que se dissolve (ao tocar num chip), sem estado React.
  Campo de texto NÃO usa `press`: transiciona só borda e sombra.
*/

interface NumberInputProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  /**
   * texto digitado → número; undefined quando vazio. `colado`: o texto entrou
   * de uma vez (colar, soltar, preenchimento do navegador), não tecla a tecla.
   */
  parse: (text: string, colado: boolean) => number | undefined;
  /** número → texto mostrado */
  format: (n: number) => string;
  /** texto digitado → o que fica na tela enquanto a pessoa digita; null = `format(valor)` */
  rascunho?: (text: string) => string | null;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** esconde o rótulo visualmente (quando a pergunta já é o h1) */
  hideLabel?: boolean;
  describedBy?: string;
  invalid?: boolean;
  size?: "lg" | "md" | "sm";
  /** incremente pra caixa piscar o anel (data-flash → animate-field-flash) */
  flashKey?: number;
  className?: string;
  /** classes da caixa do campo (ex.: largura), sem afetar o rótulo */
  campoClassName?: string;
}

/** O trecho que entrou numa edição: o que sobra tirando o começo e o fim em comum com o texto anterior. */
function textoInserido(antes: string, depois: string): string {
  let inicio = 0;
  while (inicio < antes.length && inicio < depois.length && antes[inicio] === depois[inicio]) inicio++;
  let fim = 0;
  const limite = Math.min(antes.length, depois.length) - inicio;
  while (fim < limite && antes[antes.length - 1 - fim] === depois[depois.length - 1 - fim]) fim++;
  return depois.slice(inicio, depois.length - fim);
}

function digitosADireita(texto: string, posicao: number): number {
  return texto.slice(posicao).replace(/\D/g, "").length;
}

/**
 * Onde o cursor fica com `quantos` dígitos à direita: logo depois do dígito
 * anterior a eles. Sem dígito à direita, no fim — senão uma vírgula recém-digitada
 * ficaria à direita do cursor e o próximo dígito entraria antes dela.
 */
function posicaoComDigitosADireita(texto: string, quantos: number): number {
  if (quantos === 0) return texto.length;
  let aEsquerda = texto.replace(/\D/g, "").length - quantos;
  if (aEsquerda <= 0) return 0;
  for (let i = 0; i < texto.length; i++) {
    if (/\d/.test(texto[i]) && --aEsquerda === 0) return i + 1;
  }
  return texto.length;
}

const CAIXA = {
  lg: "h-16 rounded-2xl border border-input bg-card px-5",
  md: "h-14 rounded-2xl border border-input bg-card px-5",
  sm: "h-11 gap-1 px-0",
} as const;

const COM_CAIXA =
  "transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo focus-within:border-ring focus-within:ring-3 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background has-aria-invalid:border-warn has-aria-invalid:focus-within:ring-warn motion-reduce:transition-none data-flash:animate-field-flash";

const CAMPO = { lg: "text-3xl", md: "text-2xl", sm: "text-xl text-right" } as const;

export function NumberInput({
  id,
  label,
  value,
  onChange,
  parse,
  format,
  rascunho,
  prefix,
  suffix,
  placeholder,
  autoFocus,
  hideLabel,
  describedBy,
  invalid,
  size = "lg",
  flashKey,
  className,
  campoClassName,
}: NumberInputProps) {
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  const derivado = value === undefined ? "" : format(value);
  // o rascunho só vale enquanto ainda descreve o valor: chip, slider ou outra resposta trocam o valor e ele cai
  const texto = emEdicao !== null && parse(emEdicao, false) === value ? emEdicao : derivado;
  const caixa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  /** dígitos à direita do cursor na última edição; aplicado depois que o texto novo chega ao DOM */
  const cursor = useRef<number | null>(null);

  useLayoutEffect(() => {
    const quantos = cursor.current;
    const el = campo.current;
    cursor.current = null;
    if (quantos === null || !el || document.activeElement !== el) return;
    const posicao = posicaoComDigitosADireita(el.value, quantos);
    el.setSelectionRange(posicao, posicao);
  });

  /** o texto que a tela mostraria depois de digitar `t` */
  function naTela(t: string): string {
    const r = rascunho?.(t);
    if (r) return r;
    const n = parse(t, false);
    return n === undefined ? "" : format(n);
  }

  function aoMudar(e: ChangeEvent<HTMLInputElement>) {
    let novo = e.target.value;
    let posicao = e.target.selectionStart ?? novo.length;
    // Colar é reconhecido pelo tipo do evento. O tamanho da diferença engana quando se
    // cola POR CIMA do valor: "3500" sobre "3.500,00" difere em 1 caractere e virava
    // digitação da direita pra esquerda (R$ 35,00). Sem inputType (preenchimento do
    // navegador em alguns motores), vale o tamanho do trecho que entrou.
    const tipo = e.nativeEvent instanceof InputEvent ? e.nativeEvent.inputType : "";
    const colado = tipo
      ? tipo === "insertFromPaste" || tipo === "insertFromDrop" || tipo === "insertReplacementText"
      : textoInserido(texto, novo).length > 1;

    // Um ponto DIGITADO é a vírgula decimal de quem escreve "2500.50": os pontos de
    // milhar a máscara põe sozinha, a pessoa nunca precisa digitar um.
    if (tipo === "insertText" && e.nativeEvent instanceof InputEvent && e.nativeEvent.data === "." && posicao > 0) {
      novo = novo.slice(0, posicao - 1) + "," + novo.slice(posicao);
    }

    // Um separador apagado sozinho: a máscara devolveria o mesmo texto e a tecla não faria nada.
    if (!colado && novo.length === texto.length - 1 && naTela(novo) === texto) {
      const praFrente = e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === "deleteContentForward";
      let alvo = -1;
      if (praFrente) {
        for (let i = posicao; i < novo.length && alvo < 0; i++) if (/\d/.test(novo[i])) alvo = i;
      } else {
        for (let i = posicao - 1; i >= 0 && alvo < 0; i--) if (/\d/.test(novo[i])) alvo = i;
      }
      if (alvo >= 0) {
        novo = novo.slice(0, alvo) + novo.slice(alvo + 1);
        if (!praFrente) posicao = alvo;
      }
    } else if (
      !colado &&
      emEdicao === texto &&
      novo.length === texto.length - 1 &&
      !/\d/.test(textoInserido(novo, texto)) &&
      rascunho?.(novo) === null
    ) {
      // Apagou o separador que só o rascunho mostra (a vírgula de "2.500,5"): o que vinha
      // depois dele sai junto. Senão os centavos grudariam nos reais — R$ 25.005.
      novo = novo.slice(0, posicao);
    }

    cursor.current = digitosADireita(novo, posicao);
    setEmEdicao(colado ? null : (rascunho?.(novo) ?? null));
    onChange(parse(novo, colado));
  }

  useEffect(() => {
    if (!flashKey) return;
    const el = caixa.current;
    if (!el) return;
    // remover e repor o atributo reinicia a animação; ler offsetWidth força o reflow entre os dois
    el.removeAttribute("data-flash");
    void el.offsetWidth;
    el.setAttribute("data-flash", "");
    const fim = () => el.removeAttribute("data-flash");
    el.addEventListener("animationend", fim, { once: true });
    return () => el.removeEventListener("animationend", fim);
  }, [flashKey]);

  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "eyebrow"}>
        {label}
      </label>
      <div
        ref={caixa}
        className={cn(
          // min-w-0 aqui e w-0 no input: sem isso a largura intrínseca do input (20 caracteres em text-3xl) estoura o grid no mobile
          "flex min-w-0 items-center gap-2",
          CAIXA[size],
          size !== "sm" && COM_CAIXA,
          campoClassName,
        )}
      >
        {prefix && (
          <span aria-hidden="true" className={cn("font-bold text-ink-2", size === "sm" ? "text-base" : "text-xl")}>
            {prefix}
          </span>
        )}
        <input
          ref={campo}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={texto}
          placeholder={placeholder}
          onChange={aoMudar}
          onBlur={() => setEmEdicao(null)}
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          className={cn(
            "w-0 min-w-0 flex-1 bg-transparent font-extrabold tracking-tight text-foreground outline-none tnum placeholder:text-ink-3",
            CAMPO[size],
          )}
        />
        {suffix && (
          <span aria-hidden="true" className="text-base font-bold text-ink-2">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
