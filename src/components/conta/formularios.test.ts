import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Todo <form> com campo de senha precisa de method="post".

  O HTML dessas telas chega do servidor antes do React. Se a pessoa aperta
  Enter antes da hidratação (celular com rede lenta), quem envia é o
  formulário nativo — e o método padrão dele é GET: a senha ia parar na URL,
  no histórico do navegador e nos logs de acesso do servidor e da CDN. Com
  POST, vai no corpo. A suíte roda em Node, sem DOM: a checagem é no código.
*/

const SRC = path.resolve(__dirname, "../..");

function arquivosTsx(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = path.join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosTsx(caminho);
    return nome.endsWith(".tsx") ? [caminho] : [];
  });
}

/**
 * A abertura de cada <form> do arquivo: do "<form" até o "<" do primeiro filho.
 * Não para no primeiro ">" porque o onSubmit costuma ser uma arrow function ("=>").
 */
function tagsDeForm(fonte: string): string[] {
  return [...fonte.matchAll(/<form\b[^<]*/g)].map((m) => m[0]);
}

const COM_SENHA = /CampoSenha|type="password"/;

describe('formulários com senha usam method="post"', () => {
  const arquivos = arquivosTsx(SRC).filter((arquivo) => COM_SENHA.test(readFileSync(arquivo, "utf8")));

  it("acha os formulários de conta (a checagem não está olhando pro lugar errado)", () => {
    const nomes = arquivos.map((a) => path.basename(a));
    expect(nomes).toEqual(expect.arrayContaining(["form-conta.tsx", "conta.tsx", "redefinir-senha.tsx"]));
    expect(arquivos.flatMap((a) => tagsDeForm(readFileSync(a, "utf8"))).length).toBeGreaterThanOrEqual(4);
  });

  it.each(arquivos.map((a) => [path.relative(SRC, a), a]))("%s", (_nome, arquivo) => {
    for (const tag of tagsDeForm(readFileSync(arquivo, "utf8"))) expect(tag, tag).toMatch(/\bmethod="post"/);
  });

  it("o Esqueci a senha (só e-mail) também: o endereço não vai pra URL", () => {
    for (const tag of tagsDeForm(readFileSync(path.join(SRC, "components/conta/form-email.tsx"), "utf8"))) {
      expect(tag).toMatch(/\bmethod="post"/);
    }
  });
});
