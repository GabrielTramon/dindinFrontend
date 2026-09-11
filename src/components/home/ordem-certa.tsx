import { ROTULO_DEGRAU, type Degrau } from "@/domain";
import { cn } from "@/lib/utils";
import { Secao, TituloSecao } from "@/components/home/secao";

/*
  O diferencial do produto: a cascata. Os rótulos vêm do domínio pra nunca
  divergir do que a tela do plano mostra. O degrau da dívida cara ganha
  destaque porque é onde a maioria começa — e onde mais se erra.
*/

const DEGRAUS: Degrau[] = [0, 1, 2, 3, 4];
const DEGRAU_DESTAQUE: Degrau = 1;

const EXPLICACAO: Record<Degrau, string> = {
  0: "Um colchão pequeno com liquidez diária, pra um imprevisto não virar dívida.",
  1: "Rotativo do cartão passa de 400% ao ano. Nenhum investimento rende isso — por isso ele vem antes de qualquer aplicação.",
  2: "Três meses de custos se a renda é fixa, seis se varia.",
  3: "Financiamento e consignado: vale antecipar, mas depois da reserva.",
  4: "Agora sim: um nome, um valor e uma data.",
};

export function OrdemCerta() {
  return (
    <Secao labelledBy="ordem-certa-titulo">
      <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
        <div className="lg:col-span-2">
          <TituloSecao id="ordem-certa-titulo">
            A ordem certa importa mais do que o valor.
          </TituloSecao>
          <p className="mt-4 max-w-prose text-lg text-ink-2">
            Todo real que sobra desce por esta escada. Um degrau só recebe quando o de cima está
            resolvido.
          </p>
        </div>

        <ol className="lg:col-span-3">
          {DEGRAUS.map((degrau) => {
            const destaque = degrau === DEGRAU_DESTAQUE;
            return (
              <li
                key={degrau}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr] gap-x-3 border-t border-l-2 border-l-transparent py-5 pl-4 last:border-b",
                  destaque && "border-l-warn",
                )}
              >
                <span
                  className={cn(
                    "tnum pt-1 font-mono text-sm text-muted-foreground",
                    destaque && "text-warn",
                  )}
                >
                  {String(degrau).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-extrabold">{ROTULO_DEGRAU[degrau]}</h3>
                  <p className="mt-1 text-ink-2">{EXPLICACAO[degrau]}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Secao>
  );
}
