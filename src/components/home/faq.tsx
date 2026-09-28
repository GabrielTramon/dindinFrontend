import { ChevronDown } from "lucide-react";
import { Secao, TituloSecao } from "@/components/home/secao";

/*
  details/summary nativos: abre e fecha sem JS, funciona antes da hidratação.
  A altura anima onde o navegador suporta ::details-content (details-anim);
  o chevron gira com mola e a resposta sobe ao entrar (enter-up).
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
      "Não. O plano inteiro funciona sem conta: o resultado aparece na hora e fica salvo no seu navegador. A conta é opcional e grátis, com e-mail e senha, e só serve pra baixar o PDF do plano.",
  },
  {
    pergunta: "Vocês dizem onde investir?",
    resposta:
      "Não. O dindin não recomenda produto, banco ou corretora — isso é atividade regulada e não é o nosso papel. O que a gente faz é mostrar a ordem certa e quanto vai pra cada degrau.",
  },
  {
    pergunta: "Meus dados vão pra onde?",
    resposta:
      "Suas respostas e seu plano ficam só no seu navegador. Se limpar o histórico, eles somem — e você refaz em 2 minutos. Se criar a conta, a gente guarda só o seu e-mail (e a senha protegida, nunca em texto), e dá pra excluir quando quiser.",
  },
];

export function Faq() {
  return (
    <Secao labelledBy="faq-titulo">
      <TituloSecao id="faq-titulo">Perguntas frequentes</TituloSecao>

      <div className="mt-8 max-w-2xl border-b">
        {PERGUNTAS.map((item) => (
          <details key={item.pergunta} className="group details-anim border-t">
            <summary className="press -mx-2 flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-2 py-4 font-bold outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
              {item.pergunta}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground transition-[rotate] duration-(--duration-enter) ease-spring group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="enter-up pb-5 text-ink-2">{item.resposta}</p>
          </details>
        ))}
      </div>
    </Secao>
  );
}
