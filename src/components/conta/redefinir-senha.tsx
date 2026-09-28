"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { CtaLink, ctaClasses } from "@/components/layout/cta-link";
import { ApiError, redefinirSenha } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CampoSenha } from "./campo-senha";
import { apagarHashDaUrl, concluirEntrada, tokenDoHash, type Entrou } from "./comum";
import { Acoes, EmailForte, Entrando, ProntoSemPlano, Texto, Titulo } from "./entrar";
import { DICA_SENHA, erroDaSenhaNova, errosDaApi } from "./validacao";

/*
  /redefinir-senha#token=… — o link "Criar uma senha nova" do e-mail.

  O token sai do hash NA HORA (antes de qualquer fetch: não fica no histórico nem
  vaza em print) e fica guardado no módulo, que sobrevive à remontagem do
  StrictMode. A pessoa digita a senha nova; o POST /auth/redefinir-senha grava,
  confirma o e-mail, gasta o token e devolve a sessão: ela já entra e volta pro
  retorno com o toast "Senha nova salva. Você entrou como …".

  Link vencido ou já usado (401): a frase da API + "Pedir outro link". Rede ou
  429: o token não foi gasto, dá pra tentar de novo com ele.
*/

const LINK_INVALIDO = "Esse link expirou ou já foi usado. Peça um novo.";

/* ---------- o token (estado de módulo) ---------- */

interface LinkRedefinir {
  /** o hash já foi lido (até lá, a tela não sabe se tem token) */
  lido: boolean;
  token: string | null;
}

const NAO_LIDO: LinkRedefinir = { lido: false, token: null };
let linkAtual: LinkRedefinir = NAO_LIDO;
const ouvintes = new Set<() => void>();

function mudarLink(proximo: LinkRedefinir): void {
  linkAtual = proximo;
  for (const ouvinte of ouvintes) ouvinte();
}

function assinarLink(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

const lerLink = () => linkAtual;
const linkNoServidor = () => NAO_LIDO;

/** Lê o #token= e apaga o hash. Sem hash, mantém um token já lido (navegação dentro do app). */
function capturarToken(): void {
  const token = tokenDoHash(window.location.hash);
  if (token) {
    apagarHashDaUrl();
    mudarLink({ lido: true, token });
    return;
  }
  if (!linkAtual.lido) mudarLink({ lido: true, token: null });
}

/**
 * O token foi usado (deu certo ou a API disse que não vale): uma volta pra cá
 * dentro do app não reabre o formulário com ele. Sem avisar os ouvintes: quem
 * redesenha a tela é o estado local que muda junto (entrou, inválido…) — um
 * aviso aqui podia pintar "link incompleto" por um quadro antes dele.
 */
function gastarToken(): void {
  linkAtual = { lido: true, token: null };
}

/* ---------- a página ---------- */

export function RedefinirSenha() {
  const router = useRouter();
  const link = useSyncExternalStore(assinarLink, lerLink, linkNoServidor);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [geral, setGeral] = useState<string | null>(null);
  const [invalido, setInvalido] = useState<string | null>(null);
  const [salvaSemLogin, setSalvaSemLogin] = useState(false);
  const [entrou, setEntrou] = useState<Entrou | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const campoRef = useRef<HTMLInputElement>(null);

  // antes da pintura: quem chega com #token= não vê "link incompleto" piscar
  useLayoutEffect(() => {
    capturarToken();
    window.addEventListener("hashchange", capturarToken);
    return () => window.removeEventListener("hashchange", capturarToken);
  }, []);

  const destino = entrou?.destino ?? null;
  useEffect(() => {
    if (destino) router.replace(destino);
  }, [destino, router]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const token = link.token;
    if (enviandoRef.current || !token) return;
    const local = erroDaSenhaNova(senha);
    if (local) {
      setErro(local);
      setGeral(null);
      campoRef.current?.focus();
      return;
    }
    enviandoRef.current = true;
    setEnviando(true);
    setErro(null);
    setGeral(null);
    try {
      const resposta = await redefinirSenha(token, senha);
      gastarToken();
      const resultado = concluirEntrada(resposta, "redefiniu");
      if (resultado) setEntrou(resultado);
      else setSalvaSemLogin(true);
    } catch (falha) {
      const tokenRecusado =
        falha instanceof ApiError &&
        (falha.status === 401 || (falha.code === "VALIDACAO" && Boolean(falha.details?.token)));
      if (tokenRecusado) {
        gastarToken();
        setInvalido(falha.status === 401 ? falha.message : LINK_INVALIDO);
        return;
      }
      const { campos, geral: fraseGeral } = errosDaApi(falha, ["senha"]);
      if (campos.senha) {
        setErro(campos.senha);
        campoRef.current?.focus();
      } else {
        setGeral(fraseGeral);
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  if (entrou?.destino) return <Entrando texto="Levando você de volta." />;

  if (entrou) {
    return (
      <ProntoSemPlano titulo="Senha nova salva">
        <Texto>
          Você entrou como <EmailForte>{entrou.email}</EmailForte>.
        </Texto>
      </ProntoSemPlano>
    );
  }

  if (salvaSemLogin) {
    return (
      <div className="enter-up grid gap-6">
        <div className="grid gap-3">
          <Titulo>Senha nova salva</Titulo>
          <Texto>Este navegador não deixou guardar o login. Entre com a senha nova pra continuar.</Texto>
        </div>
        <Acoes>
          <CtaLink href="/entrar" size="lg" transitionTypes={["nav-forward"]}>
            Entrar
          </CtaLink>
        </Acoes>
      </div>
    );
  }

  if (invalido || (link.lido && !link.token)) {
    return (
      <div className="enter-up grid gap-6">
        <div className="grid gap-3">
          <Titulo>{invalido ? "Esse link não vale mais" : "Esse link não está completo"}</Titulo>
          <Texto>
            {invalido ??
              "Abra o link direto do e-mail, sem cortar nenhum pedaço. Se não der, peça outro: ele chega em instantes."}
          </Texto>
        </div>
        <Acoes>
          <CtaLink href="/esqueci-senha" size="lg" transitionTypes={["nav-forward"]}>
            Pedir outro link
          </CtaLink>
        </Acoes>
      </div>
    );
  }

  if (!link.lido) {
    return (
      <div aria-hidden="true" className="grid gap-4">
        <div className="skeleton h-10 w-64 max-w-full rounded-xl" />
        <div className="skeleton h-4 w-72 max-w-full rounded-full" />
        <div className="skeleton mt-4 h-14 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Titulo>Crie uma senha nova</Titulo>
        <Texto>Depois de salvar, você já entra com ela.</Texto>
      </div>
      <form method="post" noValidate onSubmit={(e) => void salvar(e)} className="grid gap-5">
        <CampoSenha
          id="senha-nova"
          label="Senha nova"
          name="new-password"
          autoComplete="new-password"
          dica={DICA_SENHA}
          value={senha}
          onChange={(valor) => {
            setSenha(valor);
            if (erro) setErro(null);
            if (geral) setGeral(null);
          }}
          erro={erro}
          erroExternoId={geral ? "senha-nova-geral" : undefined}
          inputRef={campoRef}
        />
        {geral && (
          <p
            id="senha-nova-geral"
            role="alert"
            className="rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-pretty text-warn"
          >
            {geral}
          </p>
        )}
        <button
          type="submit"
          aria-disabled={enviando || undefined}
          className={cn(ctaClasses("primary", "lg"), "w-full sm:w-auto sm:justify-self-start", enviando && "opacity-70")}
        >
          {enviando ? "Salvando…" : "Salvar senha nova"}
        </button>
      </form>
    </div>
  );
}
