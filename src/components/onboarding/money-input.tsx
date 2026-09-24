import {
  arredondar,
  lerReaisColados,
  lerReaisInteiros,
  mascaraCentavosBRL,
  mascaraInteiroBRL,
  parseBRL,
  rascunhoReaisInteiros,
} from "@/lib/format";
import { NumberInput } from "./number-input";

/*
  Input de reais: prefixo "R$" fixo, máscara de milhar enquanto digita. Vazio é
  permitido (undefined) — e 0 é digitável.

  Por padrão aceita só inteiros: chutar o valor do mercado em centavos é
  trabalho sem ganho. Quem digita vírgula mesmo assim vê os centavos enquanto
  digita e o valor arredonda pro real mais próximo (sem vírgula, eles entravam
  como reais: 2500,50 virava R$ 250.050). Com `centavos`, cada dígito entra pela
  direita (como no app do banco) — é o modo do salário, onde R$ 3.247,80 é o
  número do contrato.

  Texto colado (ou preenchido pelo navegador) não é digitação: é lido inteiro,
  com o separador decimal que tiver ("R$ 2.500,00", "2,500.00", "3500").
*/

const MAX_DIGITOS = 9;
/** o maior valor que os 9 dígitos comportam, em cada modo */
const MAX_INTEIRO = 10 ** MAX_DIGITOS - 1;
const MAX_CENTAVOS = MAX_INTEIRO / 100;

function lerReais(texto: string, colado: boolean): number | undefined {
  if (!colado) return lerReaisInteiros(texto, MAX_DIGITOS);
  const n = lerReaisColados(texto);
  return n === undefined ? undefined : Math.min(MAX_INTEIRO, Math.round(n));
}

function rascunhoReais(texto: string): string | null {
  return rascunhoReaisInteiros(texto, MAX_DIGITOS);
}

function mostrarReais(n: number): string {
  return mascaraInteiroBRL(String(Math.max(0, Math.round(n))));
}

function lerReaisComCentavos(texto: string, colado: boolean): number | undefined {
  if (colado) {
    const n = lerReaisColados(texto);
    return n === undefined ? undefined : Math.min(MAX_CENTAVOS, arredondar(n));
  }
  const mascarado = mascaraCentavosBRL(texto.replace(/\D/g, "").slice(0, MAX_DIGITOS));
  if (mascarado === "") return undefined;
  const n = parseBRL(mascarado);
  return Number.isNaN(n) ? undefined : n;
}

function mostrarReaisComCentavos(n: number): string {
  const centavos = Math.round(Math.max(0, arredondar(n)) * 100);
  return mascaraCentavosBRL(String(centavos));
}

interface MoneyInputProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  autoFocus?: boolean;
  hideLabel?: boolean;
  describedBy?: string;
  invalid?: boolean;
  size?: "lg" | "md" | "sm";
  flashKey?: number;
  className?: string;
  /** aceita centavos, digitados da direita pra esquerda */
  centavos?: boolean;
}

export function MoneyInput({ centavos, ...props }: MoneyInputProps) {
  return (
    <NumberInput
      {...props}
      prefix="R$"
      placeholder={centavos ? "0,00" : "0"}
      parse={centavos ? lerReaisComCentavos : lerReais}
      format={centavos ? mostrarReaisComCentavos : mostrarReais}
      rascunho={centavos ? undefined : rascunhoReais}
    />
  );
}
