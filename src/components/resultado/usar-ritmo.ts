"use client";

/* eslint-disable react-hooks/rules-of-hooks -- `usar*` é hook de verdade (ver usar-organizacao.ts) */

import { useCallback, useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import {
  outrosPotesQueCabem,
  pctDoGuardar,
  RITMO_PADRAO,
  simularRitmos,
  textosDivisor,
  type Grupo,
  type Perfil,
  type Plano,
  type Ritmo,
} from "@/domain";
import { STORAGE_KEYS, writeJSON } from "@/lib/storage";
import { itensPassamDe, poteComValor } from "./pote-comum";
import type { UsoDaOrganizacao } from "./usar-organizacao";

/*
  Trocar o ritmo, do jeito que o topo e o divisor fazem.

  - As % dos ritmos saem de `simularRitmos(perfil)`, sempre SEM a escolha manual
    do "Guardar": com ela, os três mostravam o mesmo número.
  - Escolher grava `perfil.ritmo` e apaga `aporteEscolhido` (chave ausente,
    nunca `undefined`): senão tocar no ritmo não mudaria nada, porque o valor
    feito à mão continuaria mandando.
  - Se o "Guardar" do ritmo novo + os outros potes passam do que sobra, os
    OUTROS potes encolhem proporcionalmente (itens junto) e um aviso oferece
    Desfazer, que devolve o ritmo, o valor à mão e os potes.
  - Se os itens de dentro do "Guardar" somam mais que o aporte novo, eles
    encolhem junto, na proporção (o Desfazer devolve os de antes também).
*/

export interface EscolhaDeRitmo {
  simulacoes: ReturnType<typeof simularRitmos>;
  escolher: (ritmo: Ritmo) => void;
  /** true quando o "Guardar" foi escolhido à mão (nenhum ritmo marcado) */
  personalizado: boolean;
  /** a % do que sobra que o "Guardar" tem agora */
  pctAtual: number;
}

/** O perfil sem a escolha manual e com o ritmo novo. Chave ausente, nunca `undefined`. */
export function perfilComRitmo(perfil: Perfil, ritmo: Ritmo): Perfil {
  const resto = { ...perfil };
  delete resto.aporteEscolhido;
  return { ...resto, ritmo };
}

/** A lista inteira que a troca de ritmo grava, e se os outros potes diminuíram (é quando vem o aviso). */
export interface GruposDoRitmo {
  grupos: Grupo[];
  outrosDiminuiram: boolean;
}

/**
 * A lista depois de trocar o ritmo: o "Guardar" com os itens encolhidos quando
 * passam do aporte novo, e os outros potes encolhidos quando não cabem mais
 * (`outrosPotesQueCabem`, do domínio: a projeção de cada ritmo no cartão usa a
 * mesma conta). `null` = nada precisou mudar.
 */
export function gruposComRitmo(planoNovo: Plano, grupos: Grupo[]): GruposDoRitmo | null {
  const sistema = grupos.find((g) => g.doSistema);
  const sistemaNovo = sistema && itensPassamDe(sistema, planoNovo.aporte) ? poteComValor(sistema, planoNovo.aporte) : null;
  const outros = outrosPotesQueCabem(planoNovo, grupos);
  if (!sistemaNovo && !outros) return null;
  return {
    grupos: [
      ...(sistema ? [sistemaNovo ?? sistema] : []),
      ...(outros ?? grupos.filter((g) => !g.doSistema)),
    ],
    outrosDiminuiram: outros !== null,
  };
}

export function usarEscolhaDeRitmo(
  perfil: Perfil,
  plano: Plano,
  uso: UsoDaOrganizacao,
  hoje: Date,
): EscolhaDeRitmo {
  const toast = useToast();
  // a mesma data do plano: o prazo de cada ritmo conta o 13º igual ao cartão do topo
  const simulacoes = useMemo(() => simularRitmos(perfil, { hoje }), [perfil, hoje]);
  const personalizado = perfil.aporteEscolhido !== undefined;
  const pctAtual = pctDoGuardar(uso.aporte, plano.resumo.excedente);
  const { grupos, salvarGrupos } = uso;

  const escolher = useCallback(
    (ritmo: Ritmo) => {
      const simulado = simulacoes.find((s) => s.ritmo === ritmo);
      if (!simulado) return;
      // já está nesse ritmo, sem valor à mão: tocar de novo não muda nada
      if (!personalizado && (perfil.ritmo ?? RITMO_PADRAO) === ritmo) return;

      const perfilAntes = perfil;
      const gruposAntes = grupos;
      const mudanca = gruposComRitmo(simulado.plano, grupos);

      if (mudanca) salvarGrupos(mudanca.grupos);
      writeJSON(STORAGE_KEYS.perfil, perfilComRitmo(perfil, ritmo));

      // só os itens do "Guardar" encolheram: é o próprio ritmo que ela escolheu, sem aviso
      if (mudanca?.outrosDiminuiram) {
        toast.mostrar(textosDivisor.potesDiminuiram(ritmo), {
          id: "ritmo-potes",
          acao: {
            onClick: () => {
              writeJSON(STORAGE_KEYS.perfil, perfilAntes);
              salvarGrupos(gruposAntes);
            },
          },
        });
      }
    },
    [simulacoes, personalizado, perfil, grupos, salvarGrupos, toast],
  );

  return { simulacoes, escolher, personalizado, pctAtual };
}
