import { mascaraInteiroBRL, parseBRL } from "@/lib/format";
import { NumberInput } from "./number-input";

/*
  Input de reais: prefixo "R$" fixo, só inteiros (sem centavos), máscara de
  milhar enquanto digita. Vazio é permitido (undefined) — e 0 é digitável.
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
}

export function MoneyInput(props: MoneyInputProps) {
  return (
    <NumberInput {...props} prefix="R$" placeholder="0" parse={lerReais} format={mostrarReais} />
  );
}
