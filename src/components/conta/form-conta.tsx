"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { TextField } from "@/components/ui/text-field";
import { cadastrar, entrar, type SessaoApi } from "@/lib/api";
import { guardarRetorno, type MotivoRetorno } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { CampoSenha } from "./campo-senha";
import { lembrarEmail } from "./comum";
import {
  DICA_SENHA,
  erroDaSenhaDigitada,
  erroDaSenhaNova,
  erroDoEmail,
  errosDaApi,
  primeiroComErro,
  type CampoConta,
  type ErrosDaApi,
} from "./validacao";

/*
  Os dois formulários de conta: "Criar conta" e "Entrar". Moram aqui (e não
  nas páginas) porque aparecem em três lugares: /criar-conta e /entrar, a
  /conta sem sessão e as duas abas da gaveta do PDF, sem sair da tela.

  O formulário só fala com a API e entrega a sessão pro dono da tela
  (`onSucesso`): a página grava e navega, a gaveta grava e segue pro PDF, a
  /conta grava e fica. `onSucesso` devolve false quando não deu pra gravar
  (localStorage bloqueado), e o formulário diz isso em vez de fingir que entrou.

  - Validação no cliente com as regras e frases do servidor (./validacao);
    erro de campo da API (details) cai no campo certo.
  - Erro de campo inline, ligado por aria-describedby, e o foco vai pro
    primeiro campo com erro. Erro geral (senha errada, rede, 429) é role=alert.
  - A senha vai como foi digitada (nunca aparada); o e-mail é aparado.
  - Os links pra outra tela de entrar levam o e-mail digitado pelo retorno
    (lembrarEmail), nunca pela URL.
  - <form method="post"> em todo formulário com senha (aqui, /conta,
    /redefinir-senha e /esqueci-senha): o HTML chega do servidor antes do
    React. Um Enter antes da hidratação (rede lenta) envia o formulário nativo,
    e o padrão dele é GET — a senha ia pra URL, pro histórico e pros logs de
    acesso. Com POST ela vai no corpo, e o Next só redesenha a página. Depois
    de hidratado, o onSubmit segura o envio (preventDefault) e nada disso roda.
*/

/** pra onde voltar quando a pessoa sai daqui pro "Esqueci a senha" (sem ele, fica o retorno gravado) */
export interface RetornoFixo {
  caminho: string;
  motivo?: MotivoRetorno;
}

const SESSAO_NAO_GRAVADA =
  "Deu certo, mas este navegador não deixou guardar o login. Confira se ele está bloqueando dados de sites e tente de novo.";

function levarEmail(email: string, retorno?: RetornoFixo): void {
  if (retorno) guardarRetorno(retorno.caminho, retorno.motivo, email.trim());
  else lembrarEmail(email);
}

const linkClasses =
  "inline-flex min-h-11 items-center rounded-full font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Erros = Partial<Record<CampoConta, string>>;

/** só as frases que existem (o setState não guarda campo com null) */
function soOsErros(erros: Partial<Record<CampoConta, string | null>>): Erros {
  const limpo: Erros = {};
  for (const [campo, erro] of Object.entries(erros) as [CampoConta, string | null][]) {
    if (erro) limpo[campo] = erro;
  }
  return limpo;
}

/* ---------- peças ---------- */

interface CampoEmailProps {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  erro?: string;
  /** o que vai embaixo do erro (o "Entrar" do 409) */
  acoes?: ReactNode;
  inputRef: RefObject<HTMLInputElement | null>;
}

function CampoEmail({ id, value, onChange, erro, acoes, inputRef }: CampoEmailProps) {
  const idErro = `${id}-erro`;
  return (
    <div className="grid min-w-0 gap-2">
      <TextField
        id={id}
        ref={inputRef}
        label="E-mail"
        type="email"
        name="email"
        // "username" e não "email": é o que faz o gerenciador de senhas guardar o par e-mail + senha
        autoComplete="username"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={320}
        placeholder="voce@email.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
      />
      {erro && (
        <div id={idErro} className="grid gap-0.5">
          <p className="text-sm font-semibold text-pretty text-warn">{erro}</p>
          {acoes}
        </div>
      )}
    </div>
  );
}

function ErroGeral({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-pretty text-warn">
      {children}
    </p>
  );
}

function BotaoEnviar({ enviando, rotulo, rotuloEnviando }: { enviando: boolean; rotulo: string; rotuloEnviando: string }) {
  return (
    <button
      type="submit"
      aria-disabled={enviando || undefined}
      className={cn(ctaClasses("primary", "lg"), "w-full sm:w-auto sm:justify-self-start", enviando && "opacity-70")}
    >
      {enviando ? rotuloEnviando : rotulo}
    </button>
  );
}

/* ---------- estado comum ---------- */

interface FormContaProps {
  /** prefixo dos ids; um por tela */
  id: string;
  emailInicial?: string;
  /** a gaveta guarda o e-mail pra levar de uma aba pra outra */
  onEmailChange?: (email: string) => void;
  /** grava a sessão e segue; false = não deu pra gravar */
  onSucesso: (sessao: SessaoApi) => boolean;
  /** a gaveta foca o e-mail ao abrir (ou a senha, quando o e-mail já vem preenchido) */
  emailRef?: RefObject<HTMLInputElement | null>;
  senhaRef?: RefObject<HTMLInputElement | null>;
  /** retorno fixo pros links que saem da tela (a /conta usa "/conta"; a gaveta, o plano com motivo pdf) */
  retorno?: RetornoFixo;
  /** mostra o "Não tem conta?"/"Já tem conta?" com link pra outra página (a gaveta usa as abas) */
  comLinkDeTroca?: boolean;
  className?: string;
}

function useFormConta({ emailInicial, onEmailChange, emailRef, senhaRef }: FormContaProps) {
  const [email, setEmail] = useState(emailInicial ?? "");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [geral, setGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const proprioEmailRef = useRef<HTMLInputElement>(null);
  const emailCampo = emailRef ?? proprioEmailRef;
  const propriaSenhaRef = useRef<HTMLInputElement>(null);
  const senhaCampo = senhaRef ?? propriaSenhaRef;

  function focar(campo: CampoConta | null) {
    if (campo === "email") emailCampo.current?.focus();
    else if (campo) senhaCampo.current?.focus();
  }

  return {
    email,
    senha,
    erros,
    geral,
    enviando,
    emailCampo,
    senhaCampo,
    mudarEmail(valor: string) {
      setEmail(valor);
      onEmailChange?.(valor);
      if (erros.email) setErros((e) => ({ ...e, email: undefined }));
      if (geral) setGeral(null);
    },
    mudarSenha(valor: string) {
      setSenha(valor);
      if (erros.senha) setErros((e) => ({ ...e, senha: undefined }));
      if (geral) setGeral(null);
    },
    /** valida, chama a API e distribui os erros; devolve os erros da API (null se não falhou lá) */
    async enviar(
      locais: Partial<Record<CampoConta, string | null>>,
      chamada: () => Promise<SessaoApi>,
      onSucesso: (sessao: SessaoApi) => boolean,
    ): Promise<ErrosDaApi | null> {
      if (enviandoRef.current) return null;
      const ordem = ["email", "senha"] as const;
      const primeiroLocal = primeiroComErro(ordem, locais);
      if (primeiroLocal) {
        setErros(soOsErros(locais));
        setGeral(null);
        focar(primeiroLocal);
        return null;
      }
      enviandoRef.current = true;
      setEnviando(true);
      setErros({});
      setGeral(null);
      try {
        const sessao = await chamada();
        if (!onSucesso(sessao)) setGeral(SESSAO_NAO_GRAVADA);
        return null;
      } catch (falha) {
        const resultado = errosDaApi(falha, ordem);
        setErros(resultado.campos);
        setGeral(resultado.geral);
        focar(primeiroComErro(ordem, resultado.campos));
        return resultado;
      } finally {
        enviandoRef.current = false;
        setEnviando(false);
      }
    },
  };
}

/* ---------- Entrar ---------- */

export function FormEntrar(props: FormContaProps) {
  const { id, onSucesso, retorno, comLinkDeTroca = false, className } = props;
  const form = useFormConta(props);
  const idGeral = `${id}-erro`;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = form.email.trim();
    void form.enviar(
      { email: erroDoEmail(email), senha: erroDaSenhaDigitada(form.senha) },
      () => entrar(email, form.senha),
      onSucesso,
    );
  }

  return (
    <form method="post" noValidate onSubmit={enviar} className={cn("grid gap-5", className)}>
      <CampoEmail
        id={`${id}-email`}
        value={form.email}
        onChange={form.mudarEmail}
        erro={form.erros.email}
        inputRef={form.emailCampo}
      />
      <div className="grid gap-1">
        <CampoSenha
          id={`${id}-senha`}
          label="Senha"
          name="password"
          autoComplete="current-password"
          value={form.senha}
          onChange={form.mudarSenha}
          erro={form.erros.senha}
          erroExternoId={form.geral ? idGeral : undefined}
          inputRef={form.senhaCampo}
        />
        <Link
          href="/esqueci-senha"
          transitionTypes={["nav-forward"]}
          onClick={() => levarEmail(form.email, retorno)}
          className={cn(linkClasses, "-mr-2 justify-self-end px-2 text-sm")}
        >
          Esqueci a senha
        </Link>
      </div>
      {form.geral && <ErroGeral id={idGeral}>{form.geral}</ErroGeral>}
      <BotaoEnviar enviando={form.enviando} rotulo="Entrar" rotuloEnviando="Entrando…" />
      {comLinkDeTroca && (
        <p className="text-sm text-pretty text-ink-2">
          Não tem conta?{" "}
          <Link
            href="/criar-conta"
            transitionTypes={["nav-forward"]}
            onClick={() => levarEmail(form.email, retorno)}
            className={linkClasses}
          >
            Criar conta grátis
          </Link>
        </p>
      )}
    </form>
  );
}

/* ---------- Criar conta ---------- */

interface FormCriarContaProps extends FormContaProps {
  /** 409 na gaveta: troca pra aba "Já tenho conta" com o e-mail; sem ele, link pro /entrar */
  onJaTemConta?: (email: string) => void;
  /** a linha pequena embaixo do botão; null esconde */
  nota?: ReactNode;
}

export function FormCriarConta(props: FormCriarContaProps) {
  const {
    id,
    onSucesso,
    retorno,
    comLinkDeTroca = false,
    onJaTemConta,
    nota = "Serve pra baixar o PDF do plano. Guardamos só o e-mail.",
    className,
  } = props;
  const form = useFormConta(props);
  const [conflito, setConflito] = useState(false);
  const idGeral = `${id}-erro`;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = form.email.trim();
    setConflito(false);
    const falha = await form.enviar(
      { email: erroDoEmail(email), senha: erroDaSenhaNova(form.senha) },
      () => cadastrar(email, form.senha),
      onSucesso,
    );
    if (falha?.conflito) setConflito(true);
  }

  // 409: a frase da API vai no campo do e-mail, com o caminho pra quem já tem conta
  const acoesDoConflito =
    conflito && form.erros.email ? (
      <div className="flex flex-wrap gap-x-4 text-sm">
        {onJaTemConta ? (
          <button type="button" onClick={() => onJaTemConta(form.email)} className={linkClasses}>
            Entrar
          </button>
        ) : (
          <Link
            href="/entrar"
            transitionTypes={["nav-forward"]}
            onClick={() => levarEmail(form.email, retorno)}
            className={linkClasses}
          >
            Entrar
          </Link>
        )}
        <Link
          href="/esqueci-senha"
          transitionTypes={["nav-forward"]}
          onClick={() => levarEmail(form.email, retorno)}
          className={linkClasses}
        >
          Esqueci a senha
        </Link>
      </div>
    ) : null;

  return (
    <form method="post" noValidate onSubmit={(e) => void enviar(e)} className={cn("grid gap-5", className)}>
      <CampoEmail
        id={`${id}-email`}
        value={form.email}
        onChange={(valor) => {
          form.mudarEmail(valor);
          if (conflito) setConflito(false);
        }}
        erro={form.erros.email}
        acoes={acoesDoConflito}
        inputRef={form.emailCampo}
      />
      <CampoSenha
        id={`${id}-senha`}
        label="Senha"
        name="new-password"
        autoComplete="new-password"
        dica={DICA_SENHA}
        value={form.senha}
        onChange={form.mudarSenha}
        erro={form.erros.senha}
        erroExternoId={form.geral ? idGeral : undefined}
        inputRef={form.senhaCampo}
      />
      {form.geral && <ErroGeral id={idGeral}>{form.geral}</ErroGeral>}
      <div className="grid gap-3">
        <BotaoEnviar enviando={form.enviando} rotulo="Criar conta" rotuloEnviando="Criando conta…" />
        {nota && <p className="text-sm text-pretty text-muted-foreground">{nota}</p>}
      </div>
      {comLinkDeTroca && (
        <p className="text-sm text-pretty text-ink-2">
          Já tem conta?{" "}
          <Link
            href="/entrar"
            transitionTypes={["nav-forward"]}
            onClick={() => levarEmail(form.email, retorno)}
            className={linkClasses}
          >
            Entrar
          </Link>
        </p>
      )}
    </form>
  );
}
