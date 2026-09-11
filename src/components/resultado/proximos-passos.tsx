import { ListaNumerada } from "./lista-numerada";

/* O que fazer, na ordem. A sequência vem pronta do motor. */

export function ProximosPassos({ passos }: { passos: string[] }) {
  return (
    <section aria-labelledby="passos-titulo">
      <h2 id="passos-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Próximos passos
      </h2>
      <ListaNumerada className="mt-4" itens={passos} />
    </section>
  );
}
