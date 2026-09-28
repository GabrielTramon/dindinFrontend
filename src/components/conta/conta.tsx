"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { CircleAlert, CircleCheck, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CtaLink, ctaClasses } from "@/components/layout/cta-link";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { ApiError, CONFIRMACAO_EXCLUSAO, excluirConta, exportarDados, trocarSenha, type SessaoApi } from "@/lib/api";
import {
  consumirEntrada,
  guardarRetorno,
  sair,
  salvarSessao,
  useSessao,
  validarSessaoEmSegundoPlano,
  type ResultadoValidacao,
} from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { CampoSenha } from "./campo-senha";
import { baixarArquivo, deixarRecado, fraseDeEntrada, mensagemDeErro, mesEAno, useHidratado, useTemPlano } from "./comum";
import { Acoes, PainelEntrar, Texto, Titulo } from "./entrar";
import {
  DICA_SENHA,
  ERRO_SENHA_ATUAL_VAZIA,
  erroDaSenhaDigitada,
  erroDaSenhaNova,
  errosDaApi,
  primeiroComErro,
} from "./validacao";

/*
  /conta — o e-mail (confirmado ou não), desde quando, a senha e os direitos da
  LGPD (baixar e excluir).

  - Sem sessão: o formulário de entrar (e-mail e senha), com retorno "/conta"
    pros links que saem daqui. Entrou: a própria /conta se redesenha.
  - Com sessão: GET /me (uma vez por carregamento, dividido com o header) dá o
    "Desde", se o e-mail está confirmado e se a conta tem senha. 401 em
    qualquer chamada limpa a sessão e volta pro formulário com "Sua sessão
    expirou…"; rede não desloga ninguém.
  - Senha: "Trocar senha" (atual + nova) ou, em conta antiga sem senha,
    "Criar senha" (só a nova). Senha atual errada volta no campo dela (400 com
    details.senhaAtual — a API nunca responde 401 aqui).
  - Excluir pede EXCLUIR digitado num AlertDialog. Depois do 204 a sessão sai e
    a pessoa volta pro plano (o toast "Conta excluída." vai de recado pra lá);
    sem plano neste navegador, a própria /conta confirma.
*/

const SESSAO_EXPIROU = "Sua sessão expirou. Entre de novo pra ver sua conta.";
/** a senha mudou (e com ela a sessão), mas o navegador não deixou guardar o login novo */
const SENHA_SALVA_ENTRE_DE_NOVO = "Senha salva. Entre de novo com a senha nova.";

function ehSessaoVencida(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 401;
}

export function Conta() {
  const router = useRouter();
  const toast = useToast();
  const hidratado = useHidratado();
  const sessao = useSessao();
  const temPlano = useTemPlano();

  const [validacao, setValidacao] = useState<{ token: string; resultado: ResultadoValidacao } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [excluida, setExcluida] = useState(false);
  /** criou a senha aqui (vale pro token que a troca devolveu): o GET /me guardado ainda diz temSenha false */
  const [criouSenha, setCriouSenha] = useState<string | null>(null);

  // vindo de uma tela de entrar: "Você entrou como …", uma vez só (o motivo "pdf" não vale aqui)
  useEffect(() => {
    const entrou = consumirEntrada();
    // o ToastProvider monta junto e assina depois deste efeito; o gerente segura o aviso até lá
    if (entrou) toast.mostrar(fraseDeEntrada({ email: entrou.email, como: entrou.como }), { id: "entrada" });
  }, [toast]);

  function entrouAqui(resposta: SessaoApi): boolean {
    if (!salvarSessao(resposta)) return false;
    setAviso(null);
    toast.mostrar(fraseDeEntrada({ email: resposta.subscriber.email }), { id: "entrada" });
    return true;
  }

  /* Sem guarda de "ainda montado": no 401 a própria validação apaga a sessão, o
     efeito é desmontado ANTES do .then e o aviso de expirada se perderia. O
     resultado leva o token junto, então um resultado velho nunca vale pra outra sessão. */
  useEffect(() => {
    if (!sessao) return;
    const token = sessao.accessToken;
    void validarSessaoEmSegundoPlano().then((resultado) => {
      if (resultado.tipo === "expirada") setAviso(SESSAO_EXPIROU);
      setValidacao({ token, resultado });
    });
  }, [sessao]);

  function perdeuSessao() {
    sair();
    setExcluir(false);
    setAviso(SESSAO_EXPIROU);
  }

  /**
   * A senha nova encerrou no servidor TODAS as sessões de antes, a desta página
   * inclusive: o token que a troca devolveu entra no lugar do guardado. A conta
   * que o GET /me já trouxe continua valendo pro token novo (agora com senha).
   * @returns false quando o navegador não deixou guardar — a pessoa entra de novo
   */
  function senhaSalva(novaSessao: SessaoApi, criou: boolean): boolean {
    if (!salvarSessao(novaSessao)) {
      sair();
      setAviso(SENHA_SALVA_ENTRE_DE_NOVO);
      return false;
    }
    const token = novaSessao.accessToken;
    setValidacao((atual) =>
      atual?.resultado.tipo === "valida"
        ? { token, resultado: { tipo: "valida", conta: { ...atual.resultado.conta, temSenha: true } } }
        : atual,
    );
    if (criou) setCriouSenha(token);
    return true;
  }

  async function baixarDados() {
    if (!sessao || baixando) return;
    setBaixando(true);
    try {
      const { arquivo, nome } = await exportarDados(sessao.accessToken);
      baixarArquivo(arquivo, nome);
    } catch (erro) {
      if (ehSessaoVencida(erro)) perdeuSessao();
      else toast.mostrar(mensagemDeErro(erro));
    } finally {
      setBaixando(false);
    }
  }

  function contaExcluida() {
    setExcluir(false);
    setExcluida(true);
    sair();
    if (temPlano) {
      deixarRecado("Conta excluída.");
      router.replace("/plano/resultado");
    }
  }

  if (!hidratado) {
    return (
      <div aria-hidden="true" className="grid gap-4">
        <div className="skeleton h-10 w-56 max-w-full rounded-xl" />
        <div className="skeleton h-4 w-72 max-w-full rounded-full" />
        <div className="skeleton h-4 w-40 rounded-full" />
      </div>
    );
  }

  if (excluida) {
    return (
      <div className="enter-up grid gap-6">
        <div className="grid gap-3">
          <Titulo>Conta excluída</Titulo>
          <Texto>Tudo que o dindin guardava sobre você no servidor foi apagado. O plano deste navegador continua aqui.</Texto>
        </div>
        <Acoes>
          {temPlano ? (
            <CtaLink href="/plano/resultado" size="lg" transitionTypes={["nav-back"]}>
              Voltar pro plano
            </CtaLink>
          ) : (
            <CtaLink href="/plano" size="lg" transitionTypes={["nav-forward"]}>
              Montar meu plano
            </CtaLink>
          )}
        </Acoes>
      </div>
    );
  }

  if (!sessao) {
    return (
      <PainelEntrar
        titulo="Entre pra ver sua conta"
        aviso={aviso}
        retorno={{ caminho: "/conta" }}
        onEntrou={entrouAqui}
      />
    );
  }

  const resultado = validacao?.token === sessao.accessToken ? validacao.resultado : null;
  const conta = resultado?.tipo === "valida" ? resultado.conta : null;
  const desde = conta ? mesEAno(conta.criadoEm) : null;
  /* null = ainda carregando. Sem resposta da API (rede), conta como tem senha:
     pedir a atual sem precisar é menos ruim que deixar trocar sem ela. */
  const temSenha =
    criouSenha === sessao.accessToken ? true : conta ? conta.temSenha : resultado?.tipo === "falhou" ? true : null;

  return (
    <div className="enter-up grid gap-10">
      <div className="grid gap-6">
        <Titulo>Sua conta</Titulo>

        <dl className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-x-10">
          <div className="grid gap-1">
            <dt className="eyebrow">E-mail</dt>
            {/* e-mail longo quebra de preferência antes do @ (wbr); só se ainda não couber, em qualquer ponto */}
            <dd className="text-lg font-bold wrap-anywhere">
              {sessao.email.split("@")[0]}
              {sessao.email.includes("@") && (
                <>
                  <wbr />@{sessao.email.split("@").slice(1).join("@")}
                </>
              )}
            </dd>
            <StatusDoEmail confirmadoEm={conta ? conta.emailVerificadoEm : undefined} carregando={!resultado} />
          </div>
          <div className="grid gap-1">
            <dt className="eyebrow">Desde</dt>
            <dd className="text-lg font-bold first-letter:uppercase">
              {desde ?? (resultado ? "—" : <span aria-label="carregando" className="skeleton inline-block h-5 w-36 rounded-full align-middle" />)}
            </dd>
          </div>
        </dl>
        {resultado?.tipo === "falhou" && (
          <p className="text-sm text-pretty text-muted-foreground">{resultado.erro.message}</p>
        )}

        <Texto className="sm:text-base">
          Sua conta libera o PDF do plano. O plano em si continua guardado só neste navegador.
        </Texto>

        <Acoes>
          {temPlano ? (
            <CtaLink href="/plano/resultado" size="lg" transitionTypes={["nav-back"]}>
              Voltar pro plano
            </CtaLink>
          ) : (
            <CtaLink href="/plano" size="lg" transitionTypes={["nav-forward"]}>
              Montar meu plano
            </CtaLink>
          )}
          <button
            type="button"
            className={ctaClasses("secondary", "lg")}
            onClick={() => {
              sair();
              setAviso(null);
              toast.mostrar("Você saiu. O plano continua aqui neste navegador.");
            }}
          >
            Sair
          </button>
        </Acoes>
      </div>

      {/* a chave é o e-mail, não o token: a troca de senha devolve um token novo e o
          formulário (com o foco no "Trocar senha") precisa continuar o mesmo */}
      <SecaoSenha
        key={sessao.email}
        token={sessao.accessToken}
        email={sessao.email}
        temSenha={temSenha}
        onSenhaSalva={senhaSalva}
        onSessaoVencida={perdeuSessao}
      />

      <section aria-labelledby="seus-dados" className="grid gap-3 border-t pt-6">
        <h2 id="seus-dados" className="eyebrow">
          Seus dados
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          O dindin guarda só o seu e-mail, a senha protegida (nunca em texto) e quando a conta foi criada. Você pode
          levar uma cópia ou apagar tudo.
        </p>
        <div className="-mx-2 flex flex-col items-start gap-1 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void baixarDados()}
            aria-disabled={baixando || undefined}
            className={cn(ctaClasses("ghost"), "px-3 text-foreground", baixando && "opacity-70")}
          >
            <Download aria-hidden="true" className="size-4" />
            {baixando ? "Preparando o arquivo…" : "Baixar meus dados"}
          </button>
          <button
            type="button"
            onClick={() => setExcluir(true)}
            className={cn(ctaClasses("ghost"), "px-3 text-warn hover:bg-warn-soft hover:text-warn")}
          >
            Excluir conta
          </button>
        </div>
      </section>

      <ExcluirConta
        open={excluir}
        onOpenChange={setExcluir}
        token={sessao.accessToken}
        onExcluida={contaExcluida}
        onSessaoVencida={perdeuSessao}
      />
    </div>
  );
}

/* ---------- e-mail confirmado ---------- */

/** "E-mail confirmado" / "E-mail ainda não confirmado", embaixo do e-mail. `confirmadoEm` undefined = sem resposta da API. */
function StatusDoEmail({ confirmadoEm, carregando }: { confirmadoEm: string | null | undefined; carregando: boolean }) {
  if (carregando) {
    return (
      <dd>
        <span aria-label="carregando" className="skeleton inline-block h-4 w-40 rounded-full align-middle" />
      </dd>
    );
  }
  if (confirmadoEm === undefined) return null;
  if (confirmadoEm) {
    return (
      <dd className="flex items-center gap-1.5 text-sm font-semibold text-ink-2">
        <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
        E-mail confirmado
      </dd>
    );
  }
  return (
    <>
      <dd className="flex items-center gap-1.5 text-sm font-semibold text-warn">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        E-mail ainda não confirmado
      </dd>
      <dd className="text-sm text-pretty text-muted-foreground">
        O link pra confirmar foi pro seu e-mail quando você criou a conta.
      </dd>
    </>
  );
}

/* ---------- senha ---------- */

interface SecaoSenhaProps {
  token: string;
  /** vai num campo escondido: é o que faz o gerenciador de senhas saber de qual conta é a senha nova */
  email: string;
  /** null = o GET /me ainda não respondeu */
  temSenha: boolean | null;
  /** a senha mudou: grava a sessão nova que a troca devolveu (false = o navegador não deixou) */
  onSenhaSalva: (novaSessao: SessaoApi, criou: boolean) => boolean;
  onSessaoVencida: () => void;
}

const linkClasses =
  "inline-flex min-h-11 items-center rounded-full font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Trocar a senha (atual + nova, atrás do botão "Trocar senha") ou, em conta
 * antiga sem senha, criar uma (só a nova, já aberto).
 */
function SecaoSenha({ token, email, temSenha, onSenhaSalva, onSessaoVencida }: SecaoSenhaProps) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [erros, setErros] = useState<{ senhaAtual?: string; senhaNova?: string }>({});
  const [geral, setGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const atualRef = useRef<HTMLInputElement>(null);
  const novaRef = useRef<HTMLInputElement>(null);
  const abrirRef = useRef<HTMLButtonElement>(null);

  const mostrarFormulario = temSenha === false || aberto;

  function focarNoBotao() {
    requestAnimationFrame(() => abrirRef.current?.focus({ preventScroll: true }));
  }

  function limpar() {
    setAtual("");
    setNova("");
    setErros({});
    setGeral(null);
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoRef.current || temSenha === null) return;
    const pedeAtual = temSenha;
    const ordem = ["senhaAtual", "senhaNova"] as const;
    const locais = {
      senhaAtual: pedeAtual ? erroDaSenhaDigitada(atual, ERRO_SENHA_ATUAL_VAZIA) : null,
      senhaNova: erroDaSenhaNova(nova),
    };
    const primeiroLocal = primeiroComErro(ordem, locais);
    if (primeiroLocal) {
      setErros({ senhaAtual: locais.senhaAtual ?? undefined, senhaNova: locais.senhaNova ?? undefined });
      setGeral(null);
      (primeiroLocal === "senhaAtual" ? atualRef : novaRef).current?.focus();
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErros({});
    setGeral(null);
    try {
      const novaSessao = await trocarSenha(token, pedeAtual ? { senhaAtual: atual, senhaNova: nova } : { senhaNova: nova });
      // a senha nova derrubou as outras sessões (e esta): o token novo entra no lugar
      if (!onSenhaSalva(novaSessao, !pedeAtual)) return;
      toast.mostrar(
        pedeAtual
          ? "Senha trocada. Nos outros aparelhos, é preciso entrar de novo."
          : "Senha criada. Agora você entra com e-mail e senha.",
      );
      limpar();
      setAberto(false);
      focarNoBotao();
    } catch (falha) {
      if (falha instanceof ApiError && falha.status === 401) {
        onSessaoVencida();
        return;
      }
      const resultado = errosDaApi(falha, ordem);
      setErros(resultado.campos);
      setGeral(resultado.geral);
      const primeiro = primeiroComErro(ordem, resultado.campos);
      if (primeiro) (primeiro === "senhaAtual" ? atualRef : novaRef).current?.focus();
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby="senha-titulo" className="grid gap-3 border-t pt-6">
      <h2 id="senha-titulo" className="eyebrow">
        Senha
      </h2>

      {temSenha === null ? (
        <div aria-hidden="true" className="grid gap-2">
          <div className="skeleton h-4 w-56 max-w-full rounded-full" />
          <div className="skeleton h-11 w-40 rounded-full" />
        </div>
      ) : !mostrarFormulario ? (
        <>
          <p className="text-sm text-pretty text-muted-foreground">Você entra com e-mail e senha.</p>
          <div className="-mx-2">
            <button
              ref={abrirRef}
              type="button"
              onClick={() => {
                setAberto(true);
                requestAnimationFrame(() => atualRef.current?.focus({ preventScroll: true }));
              }}
              className={cn(ctaClasses("ghost"), "px-3 text-foreground")}
            >
              Trocar senha
            </button>
          </div>
        </>
      ) : (
        <form method="post" noValidate onSubmit={(e) => void salvar(e)} className="enter-up grid gap-5">
          <p className="text-sm text-pretty text-muted-foreground">
            {temSenha
              ? "Confirme a senha atual e escolha a nova."
              : "Sua conta ainda não tem senha. Crie uma pra entrar com e-mail e senha em qualquer aparelho."}
          </p>
          {/* o gerenciador de senhas precisa do e-mail junto pra guardar a senha nova na conta certa */}
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          {temSenha && (
            <div className="grid gap-1">
              <CampoSenha
                id="conta-senha-atual"
                label="Senha atual"
                name="current-password"
                autoComplete="current-password"
                value={atual}
                onChange={(valor) => {
                  setAtual(valor);
                  if (erros.senhaAtual) setErros((e) => ({ ...e, senhaAtual: undefined }));
                  if (geral) setGeral(null);
                }}
                erro={erros.senhaAtual}
                inputRef={atualRef}
              />
              <Link
                href="/esqueci-senha"
                transitionTypes={["nav-forward"]}
                onClick={() => guardarRetorno("/conta", undefined, email)}
                className={cn(linkClasses, "-mr-2 justify-self-end px-2 text-sm")}
              >
                Esqueci a senha
              </Link>
            </div>
          )}
          <CampoSenha
            id="conta-senha-nova"
            label={temSenha ? "Senha nova" : "Senha"}
            name="new-password"
            autoComplete="new-password"
            dica={DICA_SENHA}
            value={nova}
            onChange={(valor) => {
              setNova(valor);
              if (erros.senhaNova) setErros((e) => ({ ...e, senhaNova: undefined }));
              if (geral) setGeral(null);
            }}
            erro={erros.senhaNova}
            inputRef={novaRef}
          />
          {geral && (
            <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-pretty text-warn">
              {geral}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              aria-disabled={enviando || undefined}
              className={cn(ctaClasses("primary", "lg"), enviando && "opacity-70")}
            >
              {enviando ? "Salvando…" : temSenha ? "Trocar senha" : "Criar senha"}
            </button>
            {temSenha && (
              <button
                type="button"
                className={ctaClasses("ghost", "lg")}
                onClick={() => {
                  limpar();
                  setAberto(false);
                  focarNoBotao();
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

/* ---------- confirmação de exclusão ---------- */

interface ExcluirContaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onExcluida: () => void;
  onSessaoVencida: () => void;
}

function ExcluirConta({ open, onOpenChange, token, onExcluida, onSessaoVencida }: ExcluirContaProps) {
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campoRef = useRef<HTMLInputElement>(null);

  // no celular o teclado sobe maiúsculo; "excluir" digitado à mão também vale
  const confere = confirmacao.trim().toUpperCase() === CONFIRMACAO_EXCLUSAO;

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!confere || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await excluirConta(token, CONFIRMACAO_EXCLUSAO);
      onExcluida();
    } catch (falha) {
      if (ehSessaoVencida(falha)) {
        onSessaoVencida();
        return;
      }
      setErro(
        falha instanceof ApiError && falha.details?.confirmacao ? falha.details.confirmacao : mensagemDeErro(falha),
      );
      campoRef.current?.focus();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(proximo) => {
        if (!enviando) onOpenChange(proximo);
      }}
      onOpenChangeComplete={(aberto) => {
        if (!aberto) {
          setConfirmacao("");
          setErro(null);
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 min-h-dvh bg-foreground/35 dark:bg-background/75",
            "transition-opacity duration-(--duration-enter) ease-out-expo",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-(--duration-exit)",
            "motion-reduce:duration-[120ms]",
          )}
        />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <AlertDialog.Popup
            initialFocus={campoRef}
            className={cn(
              "w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-card outline-none sm:p-7",
              "transition-[opacity,translate] duration-(--duration-enter) ease-out-expo",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-(--duration-exit)",
              "motion-safe:data-[starting-style]:translate-y-3 motion-reduce:duration-[120ms]",
            )}
          >
            <AlertDialog.Title className="text-xl font-extrabold tracking-tight">Excluir sua conta?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-pretty text-ink-2">
              Isso apaga sua conta e tudo que o dindin guarda sobre você no servidor. O plano deste navegador continua
              aqui. Digite EXCLUIR pra confirmar.
            </AlertDialog.Description>

            <form method="post" noValidate onSubmit={confirmar} className="mt-5 grid gap-4">
              <TextField
                id="confirmar-exclusao"
                ref={campoRef}
                label="Digite EXCLUIR"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={confirmacao}
                onChange={(e) => {
                  setConfirmacao(e.target.value);
                  if (erro) setErro(null);
                }}
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? "confirmar-exclusao-erro" : undefined}
              />
              {erro && (
                <p id="confirmar-exclusao-erro" className="text-sm font-semibold text-pretty text-warn">
                  {erro}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialog.Close className={ctaClasses("ghost")} disabled={enviando}>
                  Cancelar
                </AlertDialog.Close>
                <button
                  type="submit"
                  disabled={!confere || enviando}
                  className={cn(ctaClasses("primary"), "bg-warn hover:bg-warn")}
                >
                  {enviando ? "Excluindo…" : "Excluir conta"}
                </button>
              </div>
            </form>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
