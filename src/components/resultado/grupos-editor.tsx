"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { ctaClasses } from "@/components/layout/cta-link";
import { MoneyInput } from "@/components/onboarding/money-input";
import {
  ajustarProporcionalmente,
  gruposSugeridosPara,
  MAX_GRUPOS,
  MAX_ITENS_POR_GRUPO,
  MAX_RENDIMENTO_MENSAL,
  podeAdicionarGrupo,
  podeAdicionarItem,
  type Grupo,
  type GrupoOrganizado,
  type GrupoSugerido,
  type ItemGrupo,
  type Organizacao,
  type TipoRenda,
} from "@/domain";
import { formatBRL, formatPct, mascaraTaxa, taxaDoTexto, textoDaTaxa } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  A seção "como organizar o que sobra".

  A base é o excedente do mês — o "sobraram 3.000" da pessoa —, não o que fica
  livre depois do aporte. O grupo do sistema ("Guardar") é o aporte que a
  cascata já reservou: ele aparece na lista como qualquer outro e é editável,
  porque mexer nele É escolher o ritmo na mão.

  Nada aqui bloqueia: somar mais do que sobra é um estado válido, avisado em
  vermelho e desfeito por um botão. Cortar valor enquanto a pessoa digita
  apagaria o número que ela ainda está terminando de escrever.

  Sem localStorage: estado vem por props e sai por onChange. Quem grava é a
  página.
*/

const ID_CRIAR = "grupos-criar";
const ID_PRIMEIRA_SUGESTAO = "grupos-sugestao-1";

const idNomeGrupo = (id: string) => `grupo-${id}-nome`;
const idValorGrupo = (id: string) => `grupo-${id}-valor`;
const idRendimento = (id: string) => `grupo-${id}-rendimento`;
const idAdicionarItem = (id: string) => `grupo-${id}-adicionar-item`;
const idNomeItem = (id: string) => `item-${id}-nome`;
const idValorItem = (id: string) => `item-${id}-valor`;

/*
  Quatro tons, repetidos por posição. O primeiro é o esmeralda da marca e cai
  sempre no "Guardar" (que é o primeiro da lista) — o dinheiro do plano tem a
  cor do plano. O vermelho (chart-5) fica de fora: aqui ele significaria erro,
  e organizar não é erro.
*/
const CORES_GRUPO = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"] as const;

function corDoGrupo(indice: number): string {
  return CORES_GRUPO[indice % CORES_GRUPO.length];
}

/** O nome que aparece pro leitor de tela enquanto a pessoa ainda não nomeou o grupo. */
function nomeVisivel(nome: string, padrao = "esse grupo"): string {
  return nome.trim() || padrao;
}

function novoId(): string {
  // id vem do cliente e é o mesmo que viaja pro servidor: precisa ser único por pessoa
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/*
  Rendimento é guardado como fração (0,8% ao mês = 0.008) e digitado como
  porcentagem, do jeito que a pessoa fala: "0,8" é 0,8% e "1" é 1%.

  A primeira versão usava máscara da direita pra esquerda (como o campo de
  dinheiro) e isso quebrava na mão de quem digita: o "0" de "0,8" sumia (zero
  virava campo vazio) e um "1" sozinho virava 0,1%. Campo de taxa não é campo de
  centavo — aqui o texto digitado é a fonte, e o número sai dele.
*/
const MAX_PCT_RENDIMENTO = MAX_RENDIMENTO_MENSAL * 100;

const ORGANIZADO_VAZIO = { pct: 0, restante: 0 };

export interface GruposEditorProps {
  /** o excedente do mês: a base que a pessoa reparte. Zero ou menos não renderiza nada */
  base: number;
  /** a lista completa, com o grupo do sistema na frente */
  grupos: Grupo[];
  /** o mesmo `organizarExcedente(base, grupos)` que a página já calculou */
  organizacao: Organizacao;
  /** devolve a lista inteira, inclusive o grupo do sistema */
  onChange: (grupos: Grupo[]) => void;
  /** vínculo da renda: decide quais sugestões aparecem (Imposto só pra PJ e informal) */
  tipoRenda: TipoRenda;
  /** true quando a pessoa escolheu uma meta no questionário */
  temMeta: boolean;
  /** o que o plano sugere guardar neste ritmo — pra avisar a consequência de mudar */
  aporteSugerido: number;
  /** true quando o valor do "Guardar" já é escolha da pessoa, não o do plano */
  aporteEditado?: boolean;
  /** editar o "Guardar" é escolher o aporte; `undefined` volta pro valor do plano */
  onAporteChange?: (valor: number | undefined) => void;
  /** uma linha dizendo o que o plano faz com o dinheiro do "Guardar" */
  descricaoDoSistema?: string;
}

/*
  O texto varia: a página passa os destinos do mês (o que a cascata faz com
  esse dinheiro agora). Sem ela, a frase genérica já diz a ordem.
*/
const DESCRICAO_SISTEMA_PADRAO =
  "desce na ordem da cascata — fôlego, dívida cara, reserva e só então as metas";

export function GruposEditor({
  base,
  grupos,
  organizacao,
  onChange,
  tipoRenda,
  temMeta,
  aporteSugerido,
  aporteEditado = false,
  onAporteChange,
  descricaoDoSistema = DESCRICAO_SISTEMA_PADRAO,
}: GruposEditorProps) {
  const [criando, setCriando] = useState(false);
  // "esse grupo rende?" é um controle sem campo no dado: ligado sem valor ainda
  // digitado mostra o campo vazio, em vez de um 0,0% que ninguém escreveu
  const [rendendo, setRendendo] = useState<Record<string, boolean>>({});

  // adicionar e remover mexem na lista embaixo do foco; o id aqui recebe o foco no render seguinte
  const focoPendente = useRef<string | null>(null);
  const assinatura = grupos.map((g) => `${g.id}:${g.itens.length}`).join("|");

  useEffect(() => {
    const id = focoPendente.current;
    if (id === null) return;
    focoPendente.current = null;
    document.getElementById(id)?.focus();
  }, [assinatura]);

  // base ≤ 0 é modo corte: não há o que repartir, e a página já mostra o texto de corte
  if (!(base > 0)) return null;

  const daPessoa = grupos.filter((g) => !g.doSistema);
  const cheio = !podeAdicionarGrupo(grupos);
  const sugestoes = gruposSugeridosPara(tipoRenda);
  const nomesUsados = new Set(grupos.map((g) => g.nome.trim().toLowerCase()));
  // sem nenhum grupo além do "Guardar", as sugestões aparecem direto: esconder
  // atrás de um botão é pedir que a pessoa adivinhe o que existe aqui
  const mostrarSugestoes = criando || daPessoa.length === 0;

  const porId = new Map<string, GrupoOrganizado>(organizacao.grupos.map((g) => [g.id, g]));

  function aplicar(lista: Grupo[]) {
    onChange(lista);
  }

  function trocar(id: string, patch: Partial<Grupo>) {
    aplicar(grupos.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function mudarValor(grupo: Grupo, valor: number | undefined) {
    const novo = valor ?? 0;
    trocar(grupo.id, { valor: novo });
    // o valor do "Guardar" não é um grupo gravado: é o aporte do plano
    if (grupo.doSistema) onAporteChange?.(novo);
  }

  function definirRendimento(grupo: Grupo, valor: number | undefined) {
    const novo: Grupo = { ...grupo };
    if (valor === undefined) delete novo.rendimentoMensal;
    else novo.rendimentoMensal = valor;
    aplicar(grupos.map((g) => (g.id === grupo.id ? novo : g)));
  }

  function alternarRendimento(grupo: Grupo, ligado: boolean) {
    setRendendo((r) => ({ ...r, [grupo.id]: ligado }));
    // desligar apaga o número: deixar guardado faria a meta continuar rendendo escondido
    if (!ligado) definirRendimento(grupo, undefined);
  }

  function adicionarGrupo(sugestao: GrupoSugerido) {
    if (cheio) return;
    const id = novoId();
    focoPendente.current = idNomeGrupo(id);
    setCriando(false);
    aplicar([
      ...grupos,
      {
        id,
        // "Outro" nasce sem nome de propósito: o foco cai no campo e a pessoa escreve o dela
        nome: sugestao.slug === "outro" ? "" : sugestao.nome,
        icone: sugestao.icone,
        valor: 0,
        contaParaMeta: sugestao.contaParaMeta,
        itens: [],
      },
    ]);
  }

  function removerGrupo(indice: number) {
    const grupo = grupos[indice];
    const anterior = grupos[indice - 1];
    // volta pro grupo de cima (o "Guardar" sempre está lá, e o título dele recebe foco)
    focoPendente.current = anterior ? idNomeGrupo(anterior.id) : ID_PRIMEIRA_SUGESTAO;
    aplicar(grupos.filter((g) => g.id !== grupo.id));
  }

  function adicionarItem(grupo: Grupo) {
    if (!podeAdicionarItem(grupo)) return;
    const id = novoId();
    focoPendente.current = idNomeItem(id);
    trocar(grupo.id, { itens: [...grupo.itens, { id, nome: "", valor: 0 }] });
  }

  function editarItem(grupo: Grupo, itemId: string, patch: Partial<ItemGrupo>) {
    trocar(grupo.id, {
      itens: grupo.itens.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    });
  }

  function removerItem(grupo: Grupo, itemId: string) {
    const indice = grupo.itens.findIndex((i) => i.id === itemId);
    const anterior = grupo.itens[indice - 1];
    focoPendente.current = anterior ? idNomeItem(anterior.id) : idAdicionarItem(grupo.id);
    trocar(grupo.id, { itens: grupo.itens.filter((i) => i.id !== itemId) });
  }

  function ajustar() {
    const ajustados = ajustarProporcionalmente(base, grupos);
    aplicar(ajustados);
    const sistema = ajustados.find((g) => g.doSistema);
    // o ajuste também encolhe o "Guardar", e esse valor mora fora da lista de grupos
    if (sistema) onAporteChange?.(sistema.valor);
  }

  return (
    <section aria-labelledby="grupos-titulo" className="min-w-0">
      <h2 id="grupos-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Como organizar o que sobra
      </h2>
      <p className="mt-1 text-ink-2">
        Dos <span className="tnum">{formatBRL(base)}</span> que sobram no mês, você decide quanto
        vai pra cada coisa. Dá pra criar grupos e detalhar o que tem dentro de cada um.
      </p>

      <Regua organizacao={organizacao} />

      <div aria-live="polite" className="mt-4 grid min-w-0 gap-2">
        {organizacao.excedeu ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl bg-warn-soft p-3">
            <p className="min-w-0 flex-1 text-sm font-bold text-warn">
              Você organizou <span className="tnum">{formatBRL(organizacao.excesso)}</span> a mais
              do que sobra.
            </p>
            <button type="button" onClick={ajustar} className={cn(ctaClasses("secondary", "md"))}>
              Ajustar proporcionalmente
            </button>
          </div>
        ) : (
          organizacao.sobra > 0 && (
            <p className="text-ink-2">
              <span className="font-bold text-foreground">
                Livre pro dia a dia: <span className="tnum">{formatBRL(organizacao.sobra)}</span>
              </span>{" "}
              — dinheiro sem grupo não é erro. É o que você gasta sem planilha.
            </p>
          )
        )}
      </div>

      <ul className="mt-5 grid min-w-0 gap-4">
        {grupos.map((grupo, i) => (
          <li key={grupo.id} className="min-w-0">
            <CartaoGrupo
              grupo={grupo}
              dados={porId.get(grupo.id) ?? ORGANIZADO_VAZIO}
              cor={corDoGrupo(i)}
              temMeta={temMeta}
              rendimentoAberto={rendendo[grupo.id] ?? grupo.rendimentoMensal !== undefined}
              aporteSugerido={aporteSugerido}
              aporteEditado={aporteEditado}
              descricaoDoSistema={descricaoDoSistema}
              onValor={(v) => mudarValor(grupo, v)}
              onNome={(nome) => trocar(grupo.id, { nome })}
              onContaParaMeta={(contaParaMeta) => trocar(grupo.id, { contaParaMeta })}
              onAlternarRendimento={(ligado) => alternarRendimento(grupo, ligado)}
              onRendimento={(v) => definirRendimento(grupo, v)}
              onRemover={() => removerGrupo(i)}
              onAdicionarItem={() => adicionarItem(grupo)}
              onEditarItem={(itemId, patch) => editarItem(grupo, itemId, patch)}
              onRemoverItem={(itemId) => removerItem(grupo, itemId)}
              onVoltarAoSugerido={() => onAporteChange?.(undefined)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-5 grid min-w-0 gap-3">
        {mostrarSugestoes ? (
          <div role="group" aria-label="Sugestões de grupo" className="grid min-w-0 gap-2">
            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              {daPessoa.length === 0 ? "Toque pra criar seu primeiro grupo" : "Criar grupo"}
            </p>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
              {sugestoes.map((s, i) => {
                const repetido = s.slug !== "outro" && nomesUsados.has(s.nome.toLowerCase());
                return (
                  <button
                    key={s.slug}
                    type="button"
                    id={i === 0 ? ID_PRIMEIRA_SUGESTAO : undefined}
                    onClick={() => adicionarGrupo(s)}
                    disabled={repetido || cheio}
                    aria-label={repetido ? `${s.nome} — já criado` : `Criar grupo ${s.nome}`}
                    className={cn(
                      "flex min-h-14 min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-bold transition-colors outline-none",
                      "hover:border-primary hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                      "disabled:pointer-events-none disabled:opacity-40",
                    )}
                  >
                    <IconeCategoria icone={s.icone} className="text-primary" />
                    <span className="min-w-0 leading-tight">{s.nome}</span>
                  </button>
                );
              })}
            </div>
            {criando && (
              <button
                type="button"
                onClick={() => setCriando(false)}
                className={cn(ctaClasses("ghost", "md"), "justify-self-start")}
              >
                Agora não
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            id={ID_CRIAR}
            onClick={() => setCriando(true)}
            disabled={cheio}
            className={cn(ctaClasses("secondary", "md"), "justify-self-start")}
          >
            <Plus aria-hidden="true" className="size-4" />
            Criar grupo
          </button>
        )}

        {cheio && (
          <p className="text-sm text-muted-foreground">
            Chegou no limite de {MAX_GRUPOS} grupos. Junte os menores num só.
          </p>
        )}
      </div>
    </section>
  );
}

/*
  A régua: um bloco por grupo, na mesma ordem dos cartões, mais o que sobrou. É
  uma imagem só pro leitor de tela — o aria-label soma tudo, com valor e
  porcentagem, porque quem não vê a barra precisa do mesmo resumo.
*/
function Regua({ organizacao }: { organizacao: Organizacao }) {
  const partes = organizacao.grupos.map(
    (g) => `${nomeVisivel(g.nome, "Grupo sem nome")}: ${formatBRL(g.valor)}, ${g.pct}%`,
  );
  if (organizacao.sobra > 0) {
    partes.push(
      `livre pro dia a dia: ${formatBRL(organizacao.sobra)}, ${organizacao.sobraPct}%`,
    );
  }

  const rotulo = organizacao.excedeu
    ? `De ${formatBRL(organizacao.base)} que sobram, você organizou ${formatBRL(organizacao.totalOrganizado)} — ${formatBRL(organizacao.excesso)} a mais. ${partes.join(". ")}`
    : `De ${formatBRL(organizacao.base)} que sobram: ${partes.join(". ")}`;

  return (
    <div className="mt-4 min-w-0">
      <div
        role="img"
        aria-label={rotulo}
        className={cn(
          "flex h-3 overflow-hidden rounded-full bg-muted",
          organizacao.excedeu && "ring-2 ring-warn",
        )}
      >
        {organizacao.grupos.map((g, i) => (
          <div
            key={g.id}
            className={cn("min-w-0 basis-0", corDoGrupo(i))}
            style={{ flexGrow: g.valor }}
          />
        ))}
        <div className="min-w-0 basis-0 bg-muted" style={{ flexGrow: organizacao.sobra }} />
      </div>

      <p className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2 tnum">
        {organizacao.grupos.map((g, i) =>
          g.valor > 0 ? (
            <span key={g.id} className="min-w-0">
              <Marcador className={corDoGrupo(i)} /> {nomeVisivel(g.nome, "Sem nome")}{" "}
              {formatBRL(g.valor)}
            </span>
          ) : null,
        )}
        {organizacao.sobra > 0 && (
          <span className="min-w-0">
            <Marcador className="bg-muted ring-1 ring-border" /> Livre{" "}
            {formatBRL(organizacao.sobra)}
          </span>
        )}
      </p>
    </div>
  );
}

function Marcador({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 rounded-full align-middle", className)}
    />
  );
}

interface CartaoGrupoProps {
  grupo: Grupo;
  dados: { pct: number; restante: number };
  cor: string;
  temMeta: boolean;
  rendimentoAberto: boolean;
  aporteSugerido: number;
  aporteEditado: boolean;
  descricaoDoSistema: string;
  onValor: (v: number | undefined) => void;
  onNome: (nome: string) => void;
  onContaParaMeta: (v: boolean) => void;
  onAlternarRendimento: (ligado: boolean) => void;
  onRendimento: (v: number | undefined) => void;
  onRemover: () => void;
  onAdicionarItem: () => void;
  onEditarItem: (itemId: string, patch: Partial<ItemGrupo>) => void;
  onRemoverItem: (itemId: string) => void;
  onVoltarAoSugerido: () => void;
}

function CartaoGrupo({
  grupo,
  dados,
  cor,
  temMeta,
  rendimentoAberto,
  aporteSugerido,
  aporteEditado,
  descricaoDoSistema,
  onValor,
  onNome,
  onContaParaMeta,
  onAlternarRendimento,
  onRendimento,
  onRemover,
  onAdicionarItem,
  onEditarItem,
  onRemoverItem,
  onVoltarAoSugerido,
}: CartaoGrupoProps) {
  const nome = nomeVisivel(grupo.nome);
  const sistema = grupo.doSistema === true;
  const cabeMaisItem = podeAdicionarItem(grupo);
  const noTetoDoRendimento = (grupo.rendimentoMensal ?? 0) >= MAX_RENDIMENTO_MENSAL;
  // a diferença é medida em reais inteiros: a tela mostra sem centavos, e avisar
  // por causa de R$ 0,35 seria avisar por causa do arredondamento
  const mudouOAporte =
    sistema && aporteEditado && Math.round(grupo.valor) !== Math.round(aporteSugerido);

  return (
    <div
      role="group"
      aria-label={`Grupo ${nome}`}
      className="grid min-w-0 gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex min-h-11 min-w-0 items-center gap-2">
        <span className={cn("size-2.5 shrink-0 rounded-full", cor)} aria-hidden="true" />
        <IconeCategoria icone={grupo.icone} className="text-primary" />

        {sistema ? (
          <h3
            id={idNomeGrupo(grupo.id)}
            tabIndex={-1}
            className="min-w-0 flex-1 truncate font-bold outline-none"
          >
            {grupo.nome}
          </h3>
        ) : (
          <>
            <label htmlFor={idNomeGrupo(grupo.id)} className="sr-only">
              Nome do grupo
            </label>
            <input
              id={idNomeGrupo(grupo.id)}
              type="text"
              maxLength={40}
              placeholder="Nome do grupo"
              value={grupo.nome}
              onChange={(e) => onNome(e.target.value)}
              className="w-0 min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-normal placeholder:text-ink-3"
            />
            <button
              type="button"
              onClick={onRemover}
              aria-label={`Remover grupo ${nome}`}
              className={cn(ctaClasses("ghost", "md"), "-mr-2 shrink-0")}
            >
              Remover
            </button>
          </>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <MoneyInput
          id={idValorGrupo(grupo.id)}
          label={`Quanto vai pro grupo ${nome} por mês`}
          hideLabel
          size="md"
          value={grupo.valor}
          onChange={onValor}
          className="w-0 min-w-0 flex-1"
        />
        <p className="shrink-0 text-sm font-bold text-ink-2 tnum">
          {dados.pct}%<span className="sr-only"> do que sobra</span>
        </p>
      </div>

      {sistema && (
        <div aria-live="polite" className="grid min-w-0 gap-2">
          <p className="text-sm text-ink-2">
            <span className="font-bold text-foreground">O que o plano faz com isso:</span>{" "}
            {descricaoDoSistema}
          </p>
          {mudouOAporte && (
            <div className="grid min-w-0 gap-2 rounded-xl bg-muted p-3">
              <p className="text-sm text-ink-2">
                O plano sugeria <span className="tnum">{formatBRL(aporteSugerido)}</span> por mês.
                {Math.round(grupo.valor) < Math.round(aporteSugerido)
                  ? " Guardando menos, cada degrau do plano leva mais tempo pra fechar."
                  : " Guardando mais, sobra menos pro dia a dia."}
              </p>
              <button
                type="button"
                onClick={onVoltarAoSugerido}
                className={cn(ctaClasses("ghost", "md"), "justify-self-start -ml-3")}
              >
                Voltar pro valor do plano
              </button>
            </div>
          )}
        </div>
      )}

      {grupo.itens.length > 0 && (
        <ul className="grid min-w-0 gap-2">
          {grupo.itens.map((item) => (
            <li key={item.id} className="min-w-0">
              <LinhaItem
                item={item}
                grupoNome={nome}
                onNome={(nomeItem) => onEditarItem(item.id, { nome: nomeItem })}
                onValor={(valor) => onEditarItem(item.id, { valor: valor ?? 0 })}
                onRemover={() => onRemoverItem(item.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {grupo.itens.length > 0 && dados.restante > 0 && (
        <p className="text-sm text-ink-2 tnum">
          Ainda sem nome dentro de {nome}: {formatBRL(dados.restante)}
        </p>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <button
          type="button"
          id={idAdicionarItem(grupo.id)}
          onClick={onAdicionarItem}
          disabled={!cabeMaisItem}
          className={cn(ctaClasses("secondary", "md"), "justify-self-start")}
        >
          <Plus aria-hidden="true" className="size-4" />
          {grupo.itens.length === 0 ? "Detalhar este grupo" : "Adicionar"}
        </button>
        {!cabeMaisItem && (
          <p className="text-sm text-muted-foreground">
            Chegou no limite de {MAX_ITENS_POR_GRUPO} linhas aqui dentro.
          </p>
        )}
      </div>

      <fieldset className="grid min-w-0 gap-3 border-t border-border pt-3">
        <legend className="sr-only">Opções do grupo {nome}</legend>

        <Caixinha
          id={`grupo-${grupo.id}-meta`}
          checked={grupo.contaParaMeta}
          onChange={onContaParaMeta}
          titulo="Entra na minha meta"
          ajuda={
            temMeta
              ? "O valor deste grupo soma no tempo pra chegar na sua meta."
              : "Você ainda não escolheu uma meta. Quando escolher, este grupo já entra na conta."
          }
        />

        <div className="grid min-w-0 gap-2">
          <Caixinha
            id={`grupo-${grupo.id}-rende`}
            checked={rendimentoAberto}
            onChange={onAlternarRendimento}
            titulo="Esse grupo rende por mês?"
            ajuda="Só preencha se você já sabe quanto esse dinheiro rende. O dindin não sugere taxa nem diz onde guardar."
          />

          {rendimentoAberto && (
            <div className="grid min-w-0 gap-1.5 pl-8">
              <CampoTaxa
                id={idRendimento(grupo.id)}
                valor={grupo.rendimentoMensal}
                onChange={onRendimento}
              />
              <p aria-live="polite" className="text-sm text-ink-2">
                {noTetoDoRendimento
                  ? `O máximo aqui é ${formatPct(MAX_RENDIMENTO_MENSAL)} ao mês.`
                  : "Ex.: 0,8 quer dizer 0,8% ao mês. O que está dentro deste grupo rende junto."}
              </p>
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}

interface CampoTaxaProps {
  id: string;
  valor: number | undefined;
  onChange: (fracao: number | undefined) => void;
}

/**
 * O campo do rendimento. Tem estado próprio de propósito: o texto é a fonte
 * enquanto a pessoa digita ("0," não é número nenhum, mas precisa ficar na
 * tela), e o valor do domínio é derivado dele. Ao sair do campo, o texto volta
 * a ser o do valor guardado — quem digitou "0," sem terminar vê o campo limpo.
 */
function CampoTaxa({ id, valor, onChange }: CampoTaxaProps) {
  const [digitado, setDigitado] = useState<string | null>(null);
  const texto = digitado ?? textoDaTaxa(valor);

  function digitar(bruto: string) {
    const limpo = mascaraTaxa(bruto, MAX_PCT_RENDIMENTO);
    setDigitado(limpo);
    onChange(taxaDoTexto(limpo, MAX_PCT_RENDIMENTO) ?? undefined);
  }

  return (
    <div className="grid min-w-0 gap-2 max-w-64">
      <label htmlFor={id} className="sr-only">
        Quanto rende ao mês
      </label>
      <div className="flex h-14 min-w-0 items-center gap-2 rounded-2xl border border-input bg-card px-5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 motion-reduce:transition-none">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={texto}
          placeholder="0,8"
          onChange={(e) => digitar(e.target.value)}
          onBlur={() => setDigitado(null)}
          className="w-0 min-w-0 flex-1 bg-transparent text-xl font-bold text-foreground tabular-nums outline-none placeholder:text-ink-3"
        />
        <span aria-hidden="true" className="shrink-0 text-sm font-bold text-ink-3">
          % ao mês
        </span>
      </div>
    </div>
  );
}

interface CaixinhaProps {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  titulo: string;
  ajuda: string;
}

function Caixinha({ id, checked, onChange, titulo, ajuda }: CaixinhaProps) {
  const ajudaId = `${id}-ajuda`;
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 select-none"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={ajudaId}
          onChange={(e) => onChange(e.target.checked)}
          className="size-5 shrink-0 accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="min-w-0 font-bold">{titulo}</span>
      </label>
      <p id={ajudaId} className="pl-8 text-sm text-ink-2">
        {ajuda}
      </p>
    </div>
  );
}

interface LinhaItemProps {
  item: ItemGrupo;
  grupoNome: string;
  onNome: (nome: string) => void;
  onValor: (valor: number | undefined) => void;
  onRemover: () => void;
}

function LinhaItem({ item, grupoNome, onNome, onValor, onRemover }: LinhaItemProps) {
  // a palavra "subgrupo" não existe na tela: pra quem usa, é só uma linha dentro do grupo
  const nome = nomeVisivel(item.nome, "essa linha");

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
      <label htmlFor={idNomeItem(item.id)} className="sr-only">
        O que é, dentro de {grupoNome}
      </label>
      <input
        id={idNomeItem(item.id)}
        type="text"
        maxLength={40}
        placeholder="O que é"
        value={item.nome}
        onChange={(e) => onNome(e.target.value)}
        className="w-0 min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-normal placeholder:text-ink-3"
      />

      <MoneyInput
        id={idValorItem(item.id)}
        label={`Quanto vai pra ${nome}`}
        hideLabel
        size="md"
        value={item.valor}
        onChange={onValor}
        className="w-32 shrink-0"
      />

      <button
        type="button"
        onClick={onRemover}
        aria-label={`Remover ${nome}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
