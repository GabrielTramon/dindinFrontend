"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { STEP, STEP_REDUCED } from "@/components/motion/springs";
import { reescalarAporteEscolhido, validarPerfil, type Perfil } from "@/domain";
import { readJSON, removeKey, STORAGE_KEYS, writeJSON } from "@/lib/storage";
import { Navegacao } from "./navegacao";
import { OnboardingSkeleton } from "./onboarding-skeleton";
import { Passo } from "./passo";
import { PassoControle } from "./passo-controle";
import {
  PASSOS,
  passoAnterior,
  passoPermitido,
  passosVisiveis,
  proximoPasso,
  type PassoId,
  textoDoPasso,
} from "./passos";
import { Progresso } from "./progresso";
import { lerRespostasSalvas, montarPerfil, type Respostas } from "./respostas";

/*
  O wizard. O passo atual vem da URL (?p=N, 1-based, posição fixa entre as 8),
  então o botão voltar do navegador funciona. As respostas ficam em estado e
  vão pro localStorage a cada mudança da pessoa (abrir e só olhar não grava);
  no fim, viram o perfil validado.

  A troca de passo não é view transition (?p=N é a mesma rota): é o
  AnimatePresence do motion, com direção (frente: sai pra esquerda, entra da
  direita; voltar: o inverso). Progresso e Navegacao ficam fora dele.
*/

const IDS = {
  titulo: "passo-titulo",
  ajuda: "passo-ajuda",
  erro: "passo-erro",
  controle: "passo-controle",
};

function urlDoPasso(indice: number): string {
  return `/plano?p=${indice + 1}`;
}

/** O perfil que já estava gravado antes de concluir; null se não há ou é inválido. */
function perfilGravado(): Perfil | null {
  const r = validarPerfil(readJSON<unknown>(STORAGE_KEYS.perfil, null));
  return r.ok ? r.perfil : null;
}

interface ErroFinal {
  passo: PassoId;
  mensagem: string;
}

export function Onboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduzido = useReducedMotion();

  const [respostas, setRespostas] = useState<Respostas>({});
  const [pronto, setPronto] = useState(false);
  const [emAndamento, setEmAndamento] = useState(false);
  /** a pessoa já mudou alguma resposta nesta visita; antes disso não há rascunho a gravar */
  const [editou, setEditou] = useState(false);
  const [erroFinal, setErroFinal] = useState<ErroFinal | null>(null);

  useEffect(() => {
    // Só depois de montar: ler localStorage no render daria mismatch com o HTML do servidor.
    const salvas = lerRespostasSalvas();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com um store externo (localStorage) uma vez, na montagem
    setRespostas(salvas.respostas);
    setEmAndamento(salvas.emAndamento);
    setPronto(true);
  }, []);

  // Só depois da primeira edição: gravar na montagem copiaria o perfil pra um rascunho que
  // envelhece — a tela do plano muda o perfil (ritmo, "Guardar") e o rascunho desfaria isso.
  useEffect(() => {
    if (pronto && editou) writeJSON(STORAGE_KEYS.rascunho, respostas);
  }, [pronto, editou, respostas]);

  // Sem ?p e com rascunho em andamento, retoma de onde parou: passoPermitido volta pro primeiro passo sem resposta.
  const pedido =
    !searchParams.has("p") && emAndamento ? PASSOS.length - 1 : Number(searchParams.get("p")) - 1;
  const indice = passoPermitido(pedido, respostas);

  useEffect(() => {
    if (pronto && indice !== pedido) router.replace(urlDoPasso(indice));
  }, [pronto, indice, pedido, router]);

  // Direção do slide (frente = 1, voltar = -1): estado derivado do passo anterior, ajustado
  // durante o render (padrão do React); um ref lido no render seria barrado pelo lint do compiler.
  const [ultimo, setUltimo] = useState({ indice, direcao: 1 });
  if (ultimo.indice !== indice) setUltimo({ indice, direcao: indice > ultimo.indice ? 1 : -1 });
  const direcao = ultimo.indice === indice ? ultimo.direcao : indice > ultimo.indice ? 1 : -1;

  if (!pronto) return <OnboardingSkeleton />;

  const passo = PASSOS[indice];
  const visiveis = passosVisiveis(respostas);
  const posicao = visiveis.indexOf(indice) + 1;
  const anterior = passoAnterior(indice, respostas);
  const proximo = proximoPasso(indice, respostas);
  const valido = passo.valido(respostas);
  const erro = erroFinal?.passo === passo.id ? erroFinal.mensagem : passo.erro?.(respostas);
  const describedBy = passo.ajuda ? `${IDS.ajuda} ${IDS.erro}` : IDS.erro;

  function atualizar(patch: Partial<Respostas>) {
    setErroFinal(null);
    setEditou(true);
    setRespostas((atual) => ({ ...atual, ...patch }));
  }

  function concluir() {
    const resultado = validarPerfil(montarPerfil(respostas));
    if (resultado.ok) {
      // o "Guardar" escolhido à mão é uma % da sobra: se a sobra mudou, os
      // reais mudam junto (60% continua 60%)
      const perfil = reescalarAporteEscolhido(perfilGravado(), resultado.perfil);
      const salvo = writeJSON(STORAGE_KEYS.perfil, perfil);
      if (!salvo) {
        setErroFinal({
          passo: passo.id,
          mensagem:
            "Não deu pra salvar no seu navegador (armazenamento bloqueado ou cheio). Libere o armazenamento deste site e tente de novo.",
        });
        return;
      }
      removeKey(STORAGE_KEYS.rascunho);
      router.push("/plano/resultado", { transitionTypes: ["nav-forward"] });
      return;
    }

    const primeiro = Object.entries(resultado.erros).at(0);
    const campo = primeiro?.[0].split(".")[0];
    const alvo = Math.max(
      0,
      PASSOS.findIndex((p) => p.id === campo),
    );
    setErroFinal({
      passo: PASSOS[alvo].id,
      mensagem: primeiro?.[1] ?? "Confere as respostas e tenta de novo.",
    });
    if (alvo !== indice) router.push(urlDoPasso(alvo));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valido) return;
    if (proximo === null) concluir();
    else router.push(urlDoPasso(proximo));
  }

  return (
    <form onSubmit={aoEnviar} className="enter-up flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-[5vh] pb-12 sm:px-6">
        <div className="grid gap-8">
          <Progresso atual={posicao} total={visiveis.length} />
          <AnimatePresence mode="wait" initial={false} custom={direcao}>
            <m.div
              key={passo.id}
              custom={direcao}
              variants={reduzido ? STEP_REDUCED : STEP}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid min-w-0 gap-8"
            >
              <Passo
                id={passo.id}
                pergunta={textoDoPasso(passo.pergunta, respostas) ?? ""}
                ajuda={textoDoPasso(passo.ajuda, respostas)}
                ids={IDS}
              >
                <PassoControle
                  passo={passo}
                  respostas={respostas}
                  onChange={atualizar}
                  erro={erro}
                  ids={IDS}
                  describedBy={describedBy}
                  invalid={erro !== undefined}
                />
              </Passo>
            </m.div>
          </AnimatePresence>
        </div>
      </div>

      <Navegacao
        podeVoltar={anterior !== null}
        podeContinuar={valido}
        ultimo={proximo === null}
        onVoltar={() => {
          if (anterior !== null) router.push(urlDoPasso(anterior));
        }}
      />
    </form>
  );
}
