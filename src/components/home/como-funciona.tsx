import { Secao, TituloSecao } from "@/components/home/secao";
import { Reveal } from "@/components/motion/reveal";

/*
  Três passos numerados — é uma sequência de verdade, então o número importa.
  Sem card: número grande, título, uma frase. Cada passo entra ao rolar em
  cascata (Reveal) e a divisória de cima se desenha da esquerda (rule-draw).
*/

const PASSOS = [
  {
    titulo: "Responde 9 perguntas",
    texto:
      "Salário, moradia, gastos fixos, dívidas e quanto tem guardado. Dois minutos, sem planilha.",
  },
  {
    titulo: "Recebe o plano",
    texto:
      "Uma decisão clara pro mês: o que pagar primeiro, quanto separar e quanto pode gastar sem culpa.",
  },
  {
    titulo: "Volta quando quiser",
    texto:
      "Mudou o salário? Quitou algo? Refaz em segundos. E em breve, um lembrete por mês pra ajustar.",
  },
];

export function ComoFunciona() {
  return (
    <Secao id="como-funciona" labelledBy="como-funciona-titulo">
      <TituloSecao id="como-funciona-titulo">Como funciona</TituloSecao>

      <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
        {PASSOS.map((passo, i) => (
          <Reveal as="li" i={i} key={passo.titulo} className="rule-draw pt-5">
            <span
              aria-hidden="true"
              className="tnum number-glow text-5xl font-extrabold text-primary sm:text-6xl"
            >
              {i + 1}
            </span>
            <h3 className="mt-4 text-xl font-extrabold tracking-tight">{passo.titulo}</h3>
            <p className="mt-2 text-ink-2">{passo.texto}</p>
          </Reveal>
        ))}
      </ol>
    </Secao>
  );
}
