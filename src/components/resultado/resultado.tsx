"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { staggerStyle } from "@/components/motion/stagger";
import {
  caminhoDoPlano,
  gerarPlano,
  respostaDoPlano,
  validarPerfil,
  type Perfil,
} from "@/domain";
import type { DadosDoPlanoPdf } from "@/lib/pdf";
import { readJSON, STORAGE_KEYS, subscribeStorage } from "@/lib/storage";
import { BarraFinal } from "./barra-final";
import { Caminho } from "./caminho";
import { DetalhesPlano } from "./detalhes-plano";
import { Divisor } from "./divisor";
import { JaGuardado } from "./ja-guardado";
import { EstadoVazio } from "./estado-vazio";
import { Resposta, RespostaDeCorte } from "./resposta";
import { Skeleton } from "./skeleton";
import { usarOrganizacao } from "./usar-organizacao";
import { usarEscolhaDeRitmo } from "./usar-ritmo";

/*
  Compõe a tela do plano. O perfil só existe no navegador, então a leitura
  passa por useSyncExternalStore: no servidor e durante a hidratação o
  snapshot é "carregando" (esqueleto); logo depois o cliente relê o
  localStorage e troca pelo plano — sem mismatch e sem setState em efeito.
  O snapshot é a string serializada do perfil: primitiva, logo estável
  entre renders. Sem perfil válido, mostra o caminho pra responder.
*/

const SEM_PERFIL = "";

function lerPerfilSerializado(): string {
  const bruto = readJSON<unknown>(STORAGE_KEYS.perfil, null);
  return bruto === null ? SEM_PERFIL : JSON.stringify(bruto);
}

function snapshotDoServidor(): undefined {
  return undefined;
}

type Leitura = { carregando: true; perfil: null } | { carregando: false; perfil: Perfil | null };

function usePerfilSalvo(): Leitura {
  // Outra aba pode refazer o plano; o evento `storage` avisa esta.
  const serializado = useSyncExternalStore<string | undefined>(
    subscribeStorage,
    lerPerfilSerializado,
    snapshotDoServidor,
  );

  return useMemo<Leitura>(() => {
    if (serializado === undefined) return { carregando: true, perfil: null };
    if (serializado === SEM_PERFIL) return { carregando: false, perfil: null };
    const r = validarPerfil(JSON.parse(serializado));
    return { carregando: false, perfil: r.ok ? r.perfil : null };
  }, [serializado]);
}

/*
  Uma coluna no celular (max-w-xl). Em lg, duas: à esquerda a resposta e o
  caminho, presos no topo enquanto a direita (divisor, detalhes, saídas) rola.
*/
export function Resultado() {
  const { carregando, perfil } = usePerfilSalvo();

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-6 lg:max-w-5xl">
      {carregando ? <Skeleton /> : perfil ? <PlanoCompleto perfil={perfil} /> : <EstadoVazio />}
    </div>
  );
}

const COLUNAS =
  "space-y-10 sm:space-y-16 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-14 lg:space-y-0";
const ESQUERDA = "space-y-10 lg:sticky lg:top-24";
const DIREITA = "space-y-10 sm:space-y-14";

function PlanoCompleto({ perfil }: { perfil: Perfil }) {
  // "hoje" congela na montagem: o mês do cartão e o dos marcos saem da mesma data
  const [hoje] = useState(() => new Date());
  /*
    A escolha manual do "Guardar" já faz parte do perfil, e o motor a limita ao
    teto do piso: um valor gravado antes do teto existir (ex.: 1.323 com teto
    1.173) já sai do plano no teto, então o cartão do topo e o divisor leem o
    mesmo aporte.
  */
  const plano = useMemo(() => gerarPlano(perfil), [perfil]);
  const uso = usarOrganizacao(plano);
  const ritmo = usarEscolhaDeRitmo(perfil, plano, uso);
  const { grupos } = uso;

  /*
    Os marcos e a projeção da meta que eles usaram — a ÚNICA projeção da meta
    da tela: o caminho, "Sua meta" (detalhes) e, no degrau 4, o cartão leem a
    mesma. O que o plano guarda só vira meta no degrau de metas; e se o próprio
    "Guardar" já conta na meta, ele já está na soma dos potes (ver
    `projetarMetaDoPlano`).
  */
  const caminho = useMemo(
    () => caminhoDoPlano(plano, { meta: perfil.meta, grupos, hoje }),
    [plano, perfil.meta, grupos, hoje],
  );
  const { marcos } = caminho;
  // o cartão só fala da meta no degrau 4
  const projecaoMeta = plano.degrau === 4 ? (caminho.meta?.projecao ?? null) : null;

  const resposta = useMemo(
    () =>
      respostaDoPlano(plano, {
        meta: perfil.meta,
        projecaoMeta,
        simulacoes: ritmo.simulacoes,
        grupos,
        hoje,
      }),
    [plano, perfil.meta, projecaoMeta, ritmo.simulacoes, grupos, hoje],
  );

  const entradaPdf = useMemo<DadosDoPlanoPdf>(
    () => ({ perfil, plano, grupos, organizacao: uso.organizacao, hoje }),
    [perfil, plano, grupos, uso.organizacao, hoje],
  );

  return (
    <div className={COLUNAS}>
      <div className={ESQUERDA}>
        <div className="enter-up" style={staggerStyle(0)}>
          {resposta.modo === "plano" ? (
            <Resposta resposta={resposta} onEscolherRitmo={ritmo.escolher} />
          ) : (
            <RespostaDeCorte resposta={resposta} />
          )}
        </div>
        {marcos.length >= 2 && (
          <div className="enter-up" style={staggerStyle(1)}>
            <Caminho marcos={marcos} />
          </div>
        )}
      </div>

      <div className={DIREITA}>
        <div className="enter-up" style={staggerStyle(2)}>
          {resposta.modo === "plano" ? (
            <Divisor plano={plano} perfil={perfil} uso={uso} ritmo={ritmo} />
          ) : (
            <p className="text-sm text-ink-2">{resposta.semDivisor}</p>
          )}
        </div>
        {resposta.modo === "plano" && perfil.meta && perfil.guardado > 0 && (
          <div className="enter-up" style={staggerStyle(3)}>
            <JaGuardado plano={plano} perfil={perfil} />
          </div>
        )}
        <div className="enter-up space-y-10 sm:space-y-12" style={staggerStyle(3)}>
          <DetalhesPlano plano={plano} resposta={resposta} grupos={grupos} metaNoCaminho={caminho.meta} />
          <BarraFinal entradaPdf={entradaPdf} />
        </div>
      </div>
    </div>
  );
}
