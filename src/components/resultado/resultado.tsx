"use client";

import { useMemo, useSyncExternalStore } from "react";
import { gerarPlano, validarPerfil, type Perfil, type Plano } from "@/domain";
import { readJSON, STORAGE_KEYS, subscribeStorage } from "@/lib/storage";
import { Acoes } from "./acoes";
import { Aviso } from "./aviso";
import { Cabecalho } from "./cabecalho";
import { Corte } from "./corte";
import { Decisao } from "./decisao";
import { Destino } from "./destino";
import { Detalhes } from "./detalhes";
import { Escada } from "./escada";
import { EstadoVazio } from "./estado-vazio";
import { Numeros } from "./numeros";
import { ProximosPassos } from "./proximos-passos";
import { Skeleton } from "./skeleton";

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

export function Resultado() {
  const { carregando, perfil } = usePerfilSalvo();
  const plano = useMemo(() => (perfil ? gerarPlano(perfil) : null), [perfil]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      {carregando ? <Skeleton /> : plano ? <PlanoCompleto plano={plano} /> : <EstadoVazio />}
    </div>
  );
}

function PlanoCompleto({ plano }: { plano: Plano }) {
  return (
    <div className="space-y-10 sm:space-y-14">
      <Cabecalho degrau={plano.degrau} />
      <Decisao decisao={plano.decisao} modoCorte={plano.modoCorte} />
      <Escada degrau={plano.degrau} />
      <Numeros resumo={plano.resumo} />
      {plano.corte ? (
        <Corte corte={plano.corte} />
      ) : (
        <Destino aporte={plano.aporte} livre={plano.livre} alocacoes={plano.alocacoes} />
      )}
      <Detalhes folego={plano.folego} reserva={plano.reserva} dividas={plano.dividas} />
      <ProximosPassos passos={plano.proximosPassos} />
      <Acoes />
      <Aviso />
    </div>
  );
}
