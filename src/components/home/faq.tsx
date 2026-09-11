import { ChevronDown } from "lucide-react";
import { Secao, TituloSecao } from "@/components/home/secao";

/*
  details/summary nativos: abre e fecha sem JS, funciona antes da hidratação.
*/

const PERGUNTAS = [
  {
    pergunta: "É grátis mesmo?",
    resposta:
      "Sim. O plano é e vai continuar grátis. No futuro pode existir uma versão com recursos a mais, mas o que existe hoje não vai pra trás de pagamento.",
  },
  {
    pergunta: "Preciso criar conta?",
    resposta:
      "Não. Nada de e-mail, senha ou cartão. O resultado aparece na hora e fica salvo no seu navegador.",
  },
  {
    pergunta: "Vocês dizem onde investir?",
    resposta:
      "Não. O dindin não recomenda produto, banco ou corretora — isso é atividade regulada e não é o nosso papel. O que a gente faz é mostrar a ordem certa e quanto vai pra cada degrau.",
  },
  {
    pergunta: "Meus dados vão pra onde?",
    resposta:
      "Pra lugar nenhum. As respostas ficam no seu navegador. Se limpar o histórico, elas somem — e você refaz em 2 minutos.",
  },
];

export function Faq() {
  return (
    <Secao labelledBy="faq-titulo">
      <TituloSecao id="faq-titulo">Perguntas frequentes</TituloSecao>

      <div className="mt-8 max-w-2xl border-b">
        {PERGUNTAS.map((item) => (
          <details key={item.pergunta} className="group border-t">
            <summary className="-mx-2 flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-2 py-4 font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              {item.pergunta}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="pb-5 text-ink-2">{item.resposta}</p>
          </details>
        ))}
      </div>
    </Secao>
  );
}
