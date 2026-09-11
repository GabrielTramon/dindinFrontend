"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { validarPerfil } from "@/domain";
import { removeKey, STORAGE_KEYS, writeJSON } from "@/lib/storage";
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
} from "./passos";
import { Progresso } from "./progresso";
import { lerRespostasSalvas, montarPerfil, type Respostas } from "./respostas";

/*
  O wizard. O passo atual vem da URL (?p=N, 1-based, posição fixa entre as 8),
  então o botão voltar do navegador funciona. As respostas ficam em estado e
  vão pro localStorage a cada mudança; no fim, viram o perfil validado.
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

interface ErroFinal {
  passo: PassoId;
  mensagem: string;
}

export function Onboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [respostas, setRespostas] = useState<Respostas>({});
  const [pronto, setPronto] = useState(false);
  const [emAndamento, setEmAndamento] = useState(false);
  const [erroFinal, setErroFinal] = useState<ErroFinal | null>(null);

  useEffect(() => {
    // Só depois de montar: ler localStorage no render daria mismatch com o HTML do servidor.
    const salvas = lerRespostasSalvas();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com um store externo (localStorage) uma vez, na montagem
    setRespostas(salvas.respostas);
    setEmAndamento(salvas.emAndamento);
    setPronto(true);
  }, []);

  useEffect(() => {
    if (pronto) writeJSON(STORAGE_KEYS.rascunho, respostas);
  }, [pronto, respostas]);

  // Sem ?p e com rascunho em andamento, retoma de onde parou: passoPermitido volta pro primeiro passo sem resposta.
  const pedido =
    !searchParams.has("p") && emAndamento ? PASSOS.length - 1 : Number(searchParams.get("p")) - 1;
  const indice = passoPermitido(pedido, respostas);

  useEffect(() => {
    if (pronto && indice !== pedido) router.replace(urlDoPasso(indice));
  }, [pronto, indice, pedido, router]);

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
    setRespostas((atual) => ({ ...atual, ...patch }));
  }

  function concluir() {
    const resultado = validarPerfil(montarPerfil(respostas));
    if (resultado.ok) {
      const salvo = writeJSON(STORAGE_KEYS.perfil, resultado.perfil);
      if (!salvo) {
        setErroFinal({
          passo: passo.id,
          mensagem:
            "Não deu pra salvar no seu navegador (armazenamento bloqueado ou cheio). Libere o armazenamento deste site e tente de novo.",
        });
        return;
      }
      removeKey(STORAGE_KEYS.rascunho);
      router.push("/plano/resultado");
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
    <form onSubmit={aoEnviar} className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-[5vh] pb-12 sm:px-6">
        <div className="grid gap-8">
          <Progresso atual={posicao} total={visiveis.length} />
          <Passo
            key={passo.id}
            id={passo.id}
            pergunta={passo.pergunta}
            ajuda={passo.ajuda}
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
