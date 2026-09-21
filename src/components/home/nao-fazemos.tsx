import { Secao, TituloSecao } from "@/components/home/secao";
import { Reveal } from "@/components/motion/reveal";
import { XDraw } from "@/components/ui/drawn-icon";

/*
  O que o dindin não faz é parte do produto. Lista simples, sem card.
  Os itens entram em cascata ao rolar e o X se desenha quando revelado.
*/

const ITENS = [
  {
    titulo: "Não pede cadastro.",
    texto: "Você vê o plano antes de qualquer conta. Seus dados ficam no seu navegador.",
  },
  {
    titulo: "Não indica banco, corretora ou produto.",
    texto: "Por regulação e por princípio. Só a ordem certa e quanto vai pra cada coisa.",
  },
  {
    titulo: "Não pede pra lançar gasto todo dia.",
    texto: "Você responde uma vez e ajusta quando algo muda.",
  },
];

export function NaoFazemos() {
  return (
    <Secao labelledBy="nao-fazemos-titulo">
      <TituloSecao id="nao-fazemos-titulo">O que o dindin não faz</TituloSecao>

      <ul className="mt-8 max-w-2xl space-y-6">
        {ITENS.map((item, i) => (
          <Reveal as="li" i={i} key={item.titulo} className="flex gap-3">
            <XDraw className="mt-1 size-5 shrink-0 text-warn" delay={i * 40} />
            <div>
              <h3 className="text-lg font-extrabold">{item.titulo}</h3>
              <p className="mt-1 text-ink-2">{item.texto}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </Secao>
  );
}
