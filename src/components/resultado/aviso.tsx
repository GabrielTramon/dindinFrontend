/*
  Disclaimer educacional. Não é enfeite: é o limite regulatório do produto
  e precisa estar visível em toda tela com plano.
*/

export function Aviso() {
  return (
    <p className="rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
      Este plano é conteúdo educacional sobre organização financeira, gerado a partir das suas
      respostas. O dindin não recomenda produtos, bancos, corretoras ou investimentos específicos
      e não substitui um profissional. Nos termos da Resolução CVM 19, não constitui consultoria
      de valores mobiliários.
    </p>
  );
}
