@AGENTS.md

# dindin

Planejador financeiro gratuito, em pt-BR, pra quem está começando a trabalhar (18–30 anos). A pessoa responde 9 perguntas e recebe um plano: o que pagar primeiro, quanto guardar, quanto sobra pra gastar. Tudo funciona sem conta (a conta opcional só libera o PDF), sem anúncio no fluxo do plano, conteúdo educacional — nunca cita produto, banco ou emissor.

## Comandos

- `yarn dev` · `yarn build` · `yarn start` — o site sobe em `localhost:3700`. A API (dindinBackend) roda em `localhost:3701`; o front a acha por `NEXT_PUBLIC_API_URL` (`.env.local`).
- `yarn test` (vitest, só `src/**/*.test.ts`) · `yarn typecheck` (`next typegen && tsc --noEmit`) · `yarn lint`
- CLIs sempre via `npx --yes <pacote>` — o shim do Yarn quebra com o espaço no caminho do usuário. `yarn add` e `yarn run` funcionam.
- Não rodar `next build` e `next dev` ao mesmo tempo (disputam `.next/`).

## Estrutura

- `src/domain/` — motor puro, sem React e sem I/O. `types` (Perfil, Plano…), `config` (constantes com o porquê), `motor` (a cascata: `gerarPlano`), `textos` + `resposta` (as frases do plano: `textos` as da cascata e dos detalhes, `resposta` as do cartão do topo, do divisor e dos potes — `textosDivisor`, `textosPote`; frase nova mora num dos dois, nunca no componente nem em `components/resultado/pote-comum.ts`), `schema` (zod + `validarPerfil`), `projecao` (metas), `categorias` (catálogo de gastos fixos), `renda` (bruto → líquido), `organizacao` (grupos sobre o que sobra + projeção da meta), `divisor` (o que sobra em %: limites dos potes, reescala por `baseReferencia`, simulação dos ritmos), `marcos` ("Seu caminho": marcos com prazo e mês), `metas-catalogo` (metas e grupos sugeridos, com ícone). Importar sempre via `@/domain`.
- `src/lib/` — `format` (formatBRL, formatPct, formatMeses, parseBRL, mascaraInteiroBRL), `storage` (localStorage seguro: readJSON/writeJSON/removeKey + STORAGE_KEYS), `api` (cliente da API da conta: cadastrar, entrar, esqueci/redefinir a senha, confirmar o e-mail, /me, trocar a senha, exportar, excluir), `sessao` (sessão, retorno pós-login, `useSessao`, `confirmarSessaoNoServidor`), `pdf` (`gerarPdfDoPlano` — hoje devolve "em-breve"; plugar o PDF é trocar só ela), `utils` (cn).
- `src/components/ui/` — shadcn estilo base-nova sobre `@base-ui/react`. `brand/logo` (`<Logo />`, `<LogoMark />`). Componentes de página em `home/`, `onboarding/`, `resultado/`, `conta/` (ContaLink do header, BotaoPdf + gaveta do convite, os formulários de conta e as telas de entrar e da /conta — ver "Conta").
- `src/app/` — `/` home · `/plano` onboarding (9 perguntas, uma por tela, passo em `?p=N`) · `/plano/resultado` · `/entrar` (e-mail e senha; também abre o link "Confirme seu e-mail", `#token=`) · `/criar-conta` · `/esqueci-senha` · `/redefinir-senha` (`#token=`) · `/conta` (e-mail confirmado ou não, senha, sair, baixar e excluir os dados). As telas de conta são noindex e montam o próprio ToastProvider.

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
- Piso **da sugestão**: nenhum ritmo SUGERE deixar a pessoa com menos de 10% da renda livre (`MARGEM_MINIMA_CORTE`), e nenhum guarda menos que o equilibrado por causa do piso. `Plano.piso` conta pra tela quando isso mordeu.
- `Perfil.aporteEscolhido` sobrescreve o ritmo: é a pessoa mexendo na % do "Guardar". Entra pelo mesmo acessor, então as projeções acompanham. **Não passa pelo piso** (decisão do dono: "liberdade total com o dinheiro dela" — à mão vai até 100%): só o excedente limita (`min(escolhido, excedente)`), e a tela nunca precisa corrigir o que o motor devolve.

## Organizar o que sobra (grupos)

A pessoa divide em **porcentagem** o que sobra (excedente = renda − custos = 100%) em até 6 potes, com até 5 itens cada. O primeiro é "Guardar", do sistema (a % dele é o aporte). O resto é o pote "Pra você", que não é gravado e **não tem mínimo**: vai de 0% a 100% (`limitesDoDivisor`, em `divisor.ts`). Quem protege a pessoa de ficar sem nada é a sugestão dos ritmos, nunca uma trava na escolha dela.

- **A soma dos potes fecha em 100% da sobra**: cada [+] para no teto do pote (o valor dele + o que está no "Pra você"). Dado antigo que passa da sobra **avisa** e oferece "Ajustar proporcionalmente", que reparte a sobra na proporção dos potes.
- O formato gravado continua em **reais** (`Grupo.valor`, `aporteEscolhido`); a % é derivada na leitura. Junto dos potes vai `baseReferencia` (a sobra na hora de gravar): quando a sobra muda, `reescalarGrupos` mantém a **mesma %**. Sem ela (dado antigo), vale a base atual até a próxima gravação.
- Porcentagem e "ajustar proporcionalmente" usam maior resto em centavos, nos dois níveis (grupos e itens), pra soma fechar em 100% e no centavo.
- Cada grupo tem `contaParaMeta` (entra na soma da meta principal) e `rendimentoMensal` opcional, digitado pela pessoa — o app nunca sugere taxa nem onde investir. O rendimento fica **à vista na linha do pote** ("Rende 0,8% ao mês" + lápis, em `pote-linha.tsx`), não na gaveta ⋯; o cartão do topo diz quantos meses ele adianta a meta.
- O dinheiro do plano só conta pra meta no degrau 4: antes disso ele vai pro fôlego, pra dívida ou pra reserva. Antes do degrau 4 o "Entra na meta" do Guardar é ignorado (senão o mesmo real contava duas vezes): a parte do plano entra na meta a partir do início dela (`projetarMetaDoPlano`).
- **Uma projeção da meta só**: "Seu caminho", "Sua meta" (detalhes) e o cartão do topo usam `caminhoDoPlano().meta` (`marcos.ts`). Não projete a meta de novo num componente.
- **Menos de R$ 1 livre é resíduo de centavos e vale 0** (`LIVRE_MINIMO`): o motor guarda o aporte em reais inteiros, então sobra de R$ 1.000,55 com o Guardar em 100% deixa R$ 0,55 de fora. O cartão (`respostaDoPlano`) e o divisor (`livreQueConta`, `tetoEmReais`, `pctDoGuardar`) dão o MESMO R$, a MESMA % (100, não 98) e o mesmo "nada livre" — há teste cruzando os dois em `usar-organizacao.test.ts`. A equação do topo do divisor mostra a sobra arredondada ("= R$ 1.001 pra dividir"), sem centavos, como todo dinheiro na UI.
- Trocar de ritmo encolhe os outros potes que não cabem com `outrosPotesQueCabem` (domínio), a mesma função que projeta o prazo de cada ritmo no cartão.
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

## Conta (e-mail e senha, só pro PDF)

Duas entradas claras, "Criar conta" e "Entrar", e a pessoa entra na hora (sem esperar e-mail). O link mágico saiu da interface e da API.

- **Telas** (`src/components/conta/`): `/criar-conta` e `/entrar` usam os formulários de `form-conta.tsx` (`FormCriarConta`, `FormEntrar`), que só falam com a API e entregam a sessão pro dono da tela (`onSucesso`): a página grava e volta pro retorno (`concluirEntrada` em `comum.ts`, que também deixa o toast pro destino), a gaveta do PDF grava e segue pro PDF, a `/conta` grava e fica. `/esqueci-senha` → "Confira seu e-mail" (reenvio em 60 s, `form-email.tsx`); `/redefinir-senha#token=` → senha nova → entra. `/entrar#token=` é o link "Confirme seu e-mail" do cadastro.
- **Senha** (`campo-senha.tsx` + `validacao.ts`): regras e frases **iguais às do servidor** (8 a 128, só espaços não vale), nunca aparada nem normalizada. `autoComplete` "new-password" (criar, redefinir, trocar) ou "current-password" (entrar, senha atual). Olho com `aria-pressed` e nome fixo. Erro de campo da API (`details`) cai no campo certo (`errosDaApi`); foco no primeiro campo com erro.
- **O PDF só sai com conta conferida no servidor.** `BotaoPdf.baixar()`: sem sessão → gaveta (`convite-conta.tsx`, abas "Criar conta | Já tenho conta"); com sessão → `confirmarSessaoNoServidor()` (GET /me NOVO a cada toque, não o cache de `validarSessaoEmSegundoPlano`): 401 tira a sessão e reabre a gaveta em "Já tenho conta" com "Sua sessão venceu…" e o e-mail preenchido; rede/5xx avisa e **não** segue; ok → `gerarPdfDoPlano`. Sessão falsa ou vencida no localStorage não passa. Quando quem tirou a sessão foi a validação ao carregar a página (401 antes do toque) ou a validade passou, `sessaoVencida()` (`@/lib/sessao`) guarda o e-mail pelo resto do carregamento e a gaveta abre do mesmo jeito; `sair()` e uma sessão nova apagam o recado.
- **Retorno**: `guardarRetorno`/`lerRetorno` levam pra onde voltar (e o e-mail digitado, de uma tela de entrar pra outra — nunca na URL). As telas de entrar nunca são retorno (`caminhoInterno` recusa: seria laço).
- **`/me/senha` nunca responde 401 por senha atual errada** (vem 400 com `details.senhaAtual`): no front, 401 é sempre sessão vencida.
- **Senha nova derruba as sessões de antes** (no servidor, inclusive a de quem trocou): `trocarSenha` devolve uma sessão nova e a `/conta` grava no lugar da velha (`senhaSalva`); nos outros aparelhos o próximo pedido é 401 → "sessão venceu". O `/redefinir-senha` já entra com a sessão que a API devolve.
- **Todo `<form>` com senha tem `method="post"`** (`formularios.test.ts` confere): o HTML chega antes do React e um Enter antes da hidratação usaria o GET nativo, com a senha na URL.

## Regras de produto

- Zero anúncio em `/plano/**`. Sempre. Mesmo depois do AdSense.
- Tudo funciona sem conta. A conta é opcional, grátis, com e-mail e senha, e serve só pra baixar o PDF do plano; a API guarda o e-mail e a senha protegida (hash, nunca em texto). A sessão fica em `STORAGE_KEYS.sessao`, lida por `lerSessao`/`useSessao` (`@/lib/sessao`), nunca direto. Hoje o plano não sai do navegador — se o PDF passar a ser gerado no servidor, revisar as frases de privacidade (hero, FAQ, "O que o dindin não faz", rodapé).
- Estado do usuário fica em localStorage via `@/lib/storage`, com as chaves de `STORAGE_KEYS`. Toda leitura/escrita já é protegida; nunca acessar `window.localStorage` direto. `writeJSON`/`removeKey` avisam os assinantes **desta** aba — o evento `storage` do navegador só chega nas outras, e sem esse aviso a tela não se redesenha depois da própria escrita.
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
- Testes pra lógica sem tela: o domínio (`src/domain/*.test.ts`), `src/lib` e as peças puras de conta (`src/components/conta/validacao.test.ts`, `comum.test.ts`). A API entra por dublê de `fetch`, nunca a de verdade.
