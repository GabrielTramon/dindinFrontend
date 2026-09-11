# Dindin Frontend

Aplicação web em Next.js + TypeScript + Tailwind CSS + shadcn/ui.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui (componentes em `src/components/ui`)
- Yarn

## Setup

```bash
yarn install
cp .env.example .env.local
yarn dev
```

App em `http://localhost:3000`. A API (dindinBackend) roda em `http://localhost:3333`.

## Scripts

| Script | Descrição |
| --- | --- |
| `yarn dev` | Servidor de desenvolvimento |
| `yarn build` | Build de produção |
| `yarn start` | Sobe a build de produção |
| `yarn lint` | ESLint |

## shadcn/ui

Para adicionar componentes:

```bash
npx shadcn@latest add button card input dialog
```

Os componentes são copiados para `src/components/ui` e podem ser editados livremente.

## Estrutura

```
src/
  app/            # rotas do App Router
  components/ui/  # componentes shadcn
  lib/utils.ts    # helper cn()
```
