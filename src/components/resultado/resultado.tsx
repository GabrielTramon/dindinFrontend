"use client";

import { useMemo, useSyncExternalStore } from "react";
import { gerarPlano, projetarMeta, validarPerfil, type Perfil, type Ritmo } from "@/domain";
import { readJSON, STORAGE_KEYS, subscribeStorage, writeJSON } from "@/lib/storage";
import { Acoes } from "./acoes";
import { Aviso } from "./aviso";
import { Cabecalho } from "./cabecalho";
import { Corte } from "./corte";
import { Decisao } from "./decisao";
import { Destino } from "./destino";
import { Detalhes } from "./detalhes";
import { Escada } from "./escada";
import { EstadoVazio } from "./estado-vazio";
import { GruposEditor } from "./grupos-editor";
import { MetaCard } from "./meta-card";
import { Numeros } from "./numeros";
import { ProximosPassos } from "./proximos-passos";
import { RitmoSeletor } from "./ritmo-seletor";
import { Skeleton } from "./skeleton";
import { usarOrganizacao } from "./usar-organizacao";

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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      {carregando ? <Skeleton /> : perfil ? <PlanoCompleto perfil={perfil} /> : <EstadoVazio />}
    </div>
  );
}

function PlanoCompleto({ perfil }: { perfil: Perfil }) {
  // o aporte escolhido a dedo já faz parte do perfil, então um gerarPlano só
  const plano = useMemo(() => gerarPlano(perfil), [perfil]);
  const organizacao = usarOrganizacao(plano);
  /** o que o ritmo sugeriria, pra tela avisar a consequência de ter mudado */
  const aporteDoRitmo = Math.min(plano.piso.sugerido, plano.piso.teto);

  /*
    O ritmo mora no perfil: gravar é o que faz a página inteira recalcular
    (storage.ts avisa esta aba desde que ganhou emissor próprio). Escolher um
    ritmo também descarta um "Guardar" editado à mão — senão a pessoa tocaria
    no cartão e nada mudaria, porque o valor manual continuaria mandando.
  */
  function escolherRitmo(ritmo: Ritmo) {
    // escolher um ritmo descarta um "Guardar" editado a dedo: senão a pessoa
    // tocaria no cartão e nada mudaria, porque o valor manual continuaria mandando
    const { aporteEscolhido: _descartado, ...resto } = perfil;
    writeJSON(STORAGE_KEYS.perfil, { ...resto, ritmo });
  }

  const projecao =
    perfil.meta &&
    projetarMeta(
      perfil.meta,
      organizacao.grupos,
      // o que o plano guarda só vira meta no degrau de metas; e se a pessoa
      // marcou o próprio "Guardar" como parte da meta, ele já está na soma
      plano.degrau === 4 && !organizacao.grupos.some((g) => g.doSistema && g.contaParaMeta)
        ? plano.aporte
        : 0,
      new Date(),
    );

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
      <Detalhes
        folego={plano.folego}
        reserva={plano.reserva}
        dividas={plano.dividas}
        gastosFixos={plano.gastosFixos}
      />
      <ProximosPassos passos={plano.proximosPassos} />
      <RitmoSeletor
        perfil={perfil}
        ritmo={plano.ritmo}
        onChange={escolherRitmo}
        personalizado={organizacao.aporteEditado}
      />
      <GruposEditor
        base={plano.resumo.excedente}
        organizacao={organizacao.organizacao}
        grupos={organizacao.grupos}
        onChange={organizacao.salvarGrupos}
        onAporteChange={organizacao.escolherAporte}
        aporteSugerido={aporteDoRitmo}
        aporteEditado={organizacao.aporteEditado}
        tipoRenda={perfil.tipoRenda}
        temMeta={perfil.meta !== undefined}
        descricaoDoSistema={plano.alocacoes.map((a) => a.titulo).join(" · ")}
      />
      {perfil.meta && projecao && (
        <MetaCard
          meta={perfil.meta}
          projecao={projecao}
          degrauDeMetas={plano.degrau === 4}
          grupos={organizacao.grupos}
        />
      )}
      <Acoes />
      <Aviso />
    </div>
  );
}
