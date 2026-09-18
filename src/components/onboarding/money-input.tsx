import { arredondar, mascaraCentavosBRL, mascaraInteiroBRL, parseBRL } from "@/lib/format";
import { NumberInput } from "./number-input";

/*
  Input de reais: prefixo "R$" fixo, máscara de milhar enquanto digita. Vazio é
  permitido (undefined) — e 0 é digitável.

  Por padrão aceita só inteiros: chutar o valor do mercado em centavos é
  trabalho sem ganho. Com `centavos`, cada dígito entra pela direita (como no
  app do banco) — é o modo do salário, onde R$ 3.247,80 é o número do contrato.
*/

const MAX_DIGITOS = 9;

function lerReais(texto: string): number | undefined {
  const mascarado = mascaraInteiroBRL(texto.replace(/\D/g, "").slice(0, MAX_DIGITOS));
  if (mascarado === "") return undefined;
  const n = parseBRL(mascarado);
  return Number.isNaN(n) ? undefined : n;
}

function mostrarReais(n: number): string {
  return mascaraInteiroBRL(String(Math.max(0, Math.round(n))));
}

function lerReaisComCentavos(texto: string): number | undefined {
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
  size?: "lg" | "md";
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
    />
  );
}
