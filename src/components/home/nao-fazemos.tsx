import { X } from "lucide-react";
import { Secao, TituloSecao } from "@/components/home/secao";

/*
  O que o dindin não faz é parte do produto. Lista simples, sem card.
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
        {ITENS.map((item) => (
          <li key={item.titulo} className="flex gap-3">
            <X aria-hidden="true" className="mt-1 size-5 shrink-0 text-warn" />
            <div>
              <h3 className="text-lg font-extrabold">{item.titulo}</h3>
              <p className="mt-1 text-ink-2">{item.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </Secao>
  );
}
