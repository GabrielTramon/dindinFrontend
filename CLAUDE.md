@AGENTS.md

# dindin

Planejador financeiro gratuito, em pt-BR, pra quem está começando a trabalhar (18–30 anos). A pessoa responde 9 perguntas e recebe um plano: o que pagar primeiro, quanto guardar, quanto sobra pra gastar. Sem login no v1, sem anúncio no fluxo do plano, conteúdo educacional — nunca cita produto, banco ou emissor.

## Comandos

- `yarn dev` · `yarn build` · `yarn start`
- `yarn test` (vitest, só `src/**/*.test.ts`) · `yarn typecheck` (`next typegen && tsc --noEmit`) · `yarn lint`
- CLIs sempre via `npx --yes <pacote>` — o shim do Yarn quebra com o espaço no caminho do usuário. `yarn add` e `yarn run` funcionam.
- Não rodar `next build` e `next dev` ao mesmo tempo (disputam `.next/`).

## Estrutura

- `src/domain/` — motor puro, sem React e sem I/O. `types` (Perfil, Plano…), `config` (constantes com o porquê), `motor` (a cascata: `gerarPlano`), `textos` (toda frase do plano), `schema` (zod + `validarPerfil`), `projecao` (metas), `categorias` (catálogo de gastos fixos), `renda` (bruto → líquido), `organizacao` (grupos sobre o que sobra + projeção da meta), `metas-catalogo` (metas e grupos sugeridos, com ícone). Importar sempre via `@/domain`.
- `src/lib/` — `format` (formatBRL, formatPct, formatMeses, parseBRL, mascaraInteiroBRL), `storage` (localStorage seguro: readJSON/writeJSON/removeKey + STORAGE_KEYS), `utils` (cn).
- `src/components/ui/` — shadcn estilo base-nova sobre `@base-ui/react`. `brand/logo` (`<Logo />`, `<LogoMark />`). Componentes de página em `home/`, `onboarding/`, `resultado/`.
- `src/app/` — `/` home · `/plano` onboarding (9 perguntas, uma por tela, passo em `?p=N`) · `/plano/resultado`.

## Renda bruta → líquida

Quem é CLT pode informar o **bruto**; o app calcula o líquido com INSS + IRRF (`src/domain/renda.ts`) e é o líquido que vai pra `Perfil.rendaMensal` — todo o motor continua trabalhando com o que cai na conta.

- As tabelas ficam em `TABELAS_FOLHA` (config.ts), num literal só: atualizar em janeiro é editar dados. `renda.test.ts` compara a data de hoje com `vigenciaAte` e **fica vermelho sozinho quando a tabela vence**.
- Arredondar UMA vez no fim de cada etapa (INSS, depois IRRF, depois o líquido). Somar faixas já arredondadas erra centavo — há teste que prova.
- O redutor da Lei 15.270/2025 usa o teto literal da tabela, não a fórmula (a fórmula em R$ 5.000 arredonda pra 312,90 e vira imposto negativo).
- **Vale-transporte e plano de saúde não entram aqui**: eles são gasto fixo. Descontar dos dois lados tira o mesmo dinheiro duas vezes.
- PJ e informal informam o que cai na conta — sem o anexo do Simples e o Fator R não existe conta honesta. Pra eles, o grupo "Imposto" aparece sugerido na tela de organização.

## Ritmo

`Perfil.ritmo` (leve · equilibrado · acelerado) decide **quanto** do que sobra vira aporte — nunca a ordem da cascata. A tabela é `PROPORCAO_APORTE[ritmo][degrau]`, e a coluna `equilibrado` é a de sempre: quem não escolhe recebe o plano de antes.

- **Leia sempre por `proporcaoAporte(ritmo, degrau)`/`aportePorDegrau`.** O aporte do mês e as projeções ("zera em X meses") precisam sair da mesma conta; dois leitores independentes fazem a tela prometer um prazo que o aporte não alcança.
- Piso: nenhum ritmo deixa a pessoa com menos de 10% da renda livre (`MARGEM_MINIMA_CORTE`), e nenhum guarda menos que o equilibrado por causa do piso. `Plano.piso` conta pra tela quando isso mordeu.
- `Perfil.aporteEscolhido` sobrescreve tudo isso: é a pessoa editando o grupo "Guardar" na mão. Entra pelo mesmo acessor, então as projeções acompanham.

## Organizar o que sobra (grupos)

A pessoa reparte o **excedente** (renda − custos) em até 6 grupos, com até 5 itens cada. O primeiro é "Guardar", criado pelo sistema com o aporte do plano e editável.

- Guarda **reais**; a porcentagem é calculada na leitura, nunca gravada — senão os dois números divergem no primeiro aumento de salário.
- Porcentagem e "ajustar proporcionalmente" usam maior resto em centavos, nos dois níveis (grupos e itens), pra soma fechar em 100% e no centavo.
- Passar da base **avisa**, nunca bloqueia. Sobrar não é erro: vira "livre pro dia a dia".
- Cada grupo tem `contaParaMeta` (entra na soma da meta principal) e `rendimentoMensal` opcional, digitado pela pessoa — o app nunca sugere taxa nem onde investir.
- O dinheiro do plano só conta pra meta no degrau 4: antes disso ele vai pro fôlego, pra dívida ou pra reserva.
- Os grupos ficam em `STORAGE_KEYS.organizacao`, **fora do perfil**: o perfil é revalidado inteiro a cada render e uma árvore estranha não pode derrubar o plano da tela.

## A cascata (o produto)

Todo excedente do mês desce nesta ordem; um degrau só recebe quando o anterior está satisfeito:
`00 fôlego mínimo → 01 dívida cara (>30% a.a.) → 02 reserva (3× ou 6× custos) → 03 dívida média → 04 metas`.
Se excedente ≤ 0, o plano é de corte, não de aporte. O plano separa `aporte` (vai pra cascata) de `livre` (gasto variável, sem culpa).

## Gastos fixos

Não existe um campo único somando tudo: a pessoa escolhe categorias e informa o valor de cada uma (`Perfil.gastosFixos`). É isso que deixa o plano de corte dizer **onde** cortar, e não só quanto. `Resumo.custoFixo` é a soma, derivada pelo motor.

O catálogo vive em `src/domain/categorias.ts` e é a fonte da verdade. Cada categoria tem `slug`, `nome`, `grupo` e `icone` (nome do componente lucide, desenhado por `components/categorias/icone-categoria.tsx` — ícone desconhecido cai no padrão `Tag`).

- **Slug publicado nunca muda**: já está no localStorage de quem usou. Para aposentar uma categoria, tire da lista; não renomeie o slug.
- Mexeu no catálogo? Espelhe em `dindinBackend/prisma/categorias.ts` e rode `yarn db:seed` lá.
- O grupo `moradia` fica fora do onboarding: moradia é a pergunta 5, com lógica própria de pulo.
- `SLUG_OUTRO` é a categoria livre — a pessoa dá o nome e o ícone é o padrão. É o único slug que pode repetir na mesma lista.

## Regras de produto

- Zero anúncio em `/plano/**`. Sempre. Mesmo depois do AdSense.
- Sem login. Estado do usuário fica em localStorage via `@/lib/storage`, com as chaves de `STORAGE_KEYS`. Toda leitura/escrita já é protegida; nunca acessar `window.localStorage` direto. `writeJSON`/`removeKey` avisam os assinantes **desta** aba — o evento `storage` do navegador só chega nas outras, e sem esse aviso a tela não se redesenha depois da própria escrita.
- Campo novo no perfil: opcional no zod e **sem `.default()`** (default mudaria o snapshot de todo plano já gravado), e precisa entrar na allow-list de `sanearRespostas` — o que não está lá some no F5.
- O resultado nunca fica atrás de cadastro.
- Tom do texto: direto, acolhedor, sem julgamento, sem jargão. "quite o cartão", não "otimize seu passivo". Sem exclamação em excesso, sem emoji no corpo.
- Nunca recomendar produto, banco, corretora ou emissor. Alocação só por classe de ativo. Disclaimer educacional visível na tela do plano.
- Dinheiro na UI: `formatBRL(v)` sem centavos. Colunas de valores com a classe `tnum`.

## Design

- Fonte: Nunito, já aplicada por `font-sans`/`font-heading`. Títulos `font-extrabold tracking-tight`; corpo `font-normal`; rótulos `text-xs font-bold uppercase tracking-wider text-muted-foreground`.
- Tokens em `globals.css`: `primary` #0d6b4c (esmeralda do logo) · `background` #faf9f4 (papel quente) · `accent` #e4efe9 (verde suave) · `muted` #f1f1eb · `warn`/`warn-soft` #a34328/#f4e7e1 · `ink-2`/`ink-3` cinzas com viés verde. Usar só classes de token (`bg-primary`, `text-muted-foreground`, `bg-warn-soft`, `text-ink-2`). Nunca hex no JSX.
- Radius base 14px (`rounded-lg`). Botão principal `rounded-full`, altura ≥ 48px no mobile. Cards `rounded-2xl border bg-card`.
- Mobile-first: alvos de toque ≥ 44px, uma coluna abaixo de 640px, gutter lateral ≥ 16px, nada com largura fixa maior que a tela.
- Evitar: gradiente roxo/azul, cofrinho, cifrão, seta subindo, emoji como marcador de seção, tudo centralizado, card em tudo, sombra pesada. Ícones `lucide-react` com moderação, sempre com texto ao lado.
- Logo: `<Logo />` (marca + "dindin") e `<LogoMark />` de `@/components/brand/logo`. Herdam `currentColor` — controle pela classe `text-*`.
- Estado vazio e erro sempre explicam o que fazer, sem pedir desculpa.

## Next 16 (diferente do que você conhece)

- `PageProps<'/rota'>` e `LayoutProps<'/rota'>` são tipos globais gerados por `next typegen`/dev/build — não importar. `params` e `searchParams` são Promise.
- `useSearchParams` numa página estática **exige** `<Suspense>` acima do componente, senão `next build` falha.
- Cache Components está desligado (modelo anterior). Nada de `use cache`.
- Em dúvida sobre uma API, ler `node_modules/next/dist/docs/01-app/` antes de usar.

## Convenções de código

- Domínio em pt-BR (`Perfil`, `rendaMensal`, `gerarPlano`). Código genérico em inglês (props, handlers, utils).
- Página é Server Component por padrão; `"use client"` só no componente que tem estado ou efeito, não na página inteira quando dá pra evitar.
- Sem `any`. Sem `console.log` em código final. Sem cor literal.
- Testes só pro domínio por enquanto (`src/domain/*.test.ts`).
