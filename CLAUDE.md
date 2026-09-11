@AGENTS.md

# dindin

Planejador financeiro gratuito, em pt-BR, pra quem está começando a trabalhar (18–30 anos). A pessoa responde 8 perguntas e recebe um plano: o que pagar primeiro, quanto guardar, quanto sobra pra gastar. Sem login no v1, sem anúncio no fluxo do plano, conteúdo educacional — nunca cita produto, banco ou emissor.

## Comandos

- `yarn dev` · `yarn build` · `yarn start`
- `yarn test` (vitest, só `src/**/*.test.ts`) · `yarn typecheck` (`next typegen && tsc --noEmit`) · `yarn lint`
- CLIs sempre via `npx --yes <pacote>` — o shim do Yarn quebra com o espaço no caminho do usuário. `yarn add` e `yarn run` funcionam.
- Não rodar `next build` e `next dev` ao mesmo tempo (disputam `.next/`).

## Estrutura

- `src/domain/` — motor puro, sem React e sem I/O. `types` (Perfil, Plano…), `config` (constantes com o porquê), `motor` (a cascata: `gerarPlano`), `textos` (toda frase do plano), `schema` (zod + `validarPerfil`), `projecao` (metas). Importar sempre via `@/domain`.
- `src/lib/` — `format` (formatBRL, formatPct, formatMeses, parseBRL, mascaraInteiroBRL), `storage` (localStorage seguro: readJSON/writeJSON/removeKey + STORAGE_KEYS), `utils` (cn).
- `src/components/ui/` — shadcn estilo base-nova sobre `@base-ui/react`. `brand/logo` (`<Logo />`, `<LogoMark />`). Componentes de página em `home/`, `onboarding/`, `resultado/`.
- `src/app/` — `/` home · `/plano` onboarding (8 perguntas, uma por tela, passo em `?p=N`) · `/plano/resultado`.

## A cascata (o produto)

Todo excedente do mês desce nesta ordem; um degrau só recebe quando o anterior está satisfeito:
`00 fôlego mínimo → 01 dívida cara (>30% a.a.) → 02 reserva (3× ou 6× custos) → 03 dívida média → 04 metas`.
Se excedente ≤ 0, o plano é de corte, não de aporte. O plano separa `aporte` (vai pra cascata) de `livre` (gasto variável, sem culpa).

## Regras de produto

- Zero anúncio em `/plano/**`. Sempre. Mesmo depois do AdSense.
- Sem login. Estado do usuário fica em localStorage via `@/lib/storage`, com as chaves de `STORAGE_KEYS`. Toda leitura/escrita já é protegida; nunca acessar `window.localStorage` direto.
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
