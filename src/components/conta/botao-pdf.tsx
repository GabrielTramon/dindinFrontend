"use client";

import { FileDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { gerarPdfDoPlano, type DadosDoPlanoPdf } from "@/lib/pdf";
import {
  confirmarSessaoNoServidor,
  consumirEntrada,
  lerSessao,
  sair,
  sessaoVencida,
  useSessao,
  validarSessaoEmSegundoPlano,
} from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { baixarArquivo, fraseDeEntrada, mensagemDeErro, pegarRecado } from "./comum";
import { ConviteConta, type AbaConvite } from "./convite-conta";

/*
  "Baixar PDF", o único lugar da tela do plano que fala de conta. O PDF só sai
  com conta logada E conferida no servidor — sessão falsa ou vencida no
  localStorage não passa.

  baixar():
  1. sem sessão neste navegador → abre o ConviteConta (gaveta), sem sair da tela.
     Se a sessão caiu sem a pessoa sair (sessaoVencida: o servidor recusou o
     token — muitas vezes na validação em segundo plano, ao carregar a página,
     antes do toque — ou a validade passou), a gaveta abre como no 401 abaixo;
  2. com sessão → confere AGORA no servidor (confirmarSessaoNoServidor: um
     GET /me novo, não o cache de uma validação por carregamento):
     - 401: a sessão sai e a gaveta abre na aba "Já tenho conta", com o e-mail
       preenchido e a linha "Sua sessão venceu. Entre de novo pra baixar.";
     - rede/5xx/429: toast "Não deu pra conferir sua conta agora…" e NÃO segue;
     - ok: gerarPdfDoPlano (src/lib/pdf.ts). Hoje ela devolve "em-breve" e o
       toast explica; quando devolver um arquivo, baixa aqui por object URL.
  3. criou conta ou entrou pela gaveta → a gaveta fecha e volta pro passo 2.

  Também é o destino das telas de entrar (/entrar, /criar-conta,
  /redefinir-senha → router.replace("/plano/resultado")): ao montar, mostra UMA
  vez o toast de boas-vindas que elas deixaram.

  Recebe os dados do plano; a sessão ele mesmo acrescenta (a conferida).
*/

const ID_TOAST_PDF = "pdf";
const SESSAO_VENCEU = "Sua sessão venceu. Entre de novo pra baixar.";
const NAO_CONFERIU = "Não deu pra conferir sua conta agora. Tente de novo.";

export function BotaoPdf({ entrada }: { entrada: DadosDoPlanoPdf }) {
  const sessao = useSessao();
  const toast = useToast();
  const [convite, setConvite] = useState(false);
  const [aba, setAba] = useState<AbaConvite>("criar");
  const [aviso, setAviso] = useState<string | null>(null);
  const [emailConvite, setEmailConvite] = useState("");
  const [gerando, setGerando] = useState(false);
  const gerandoRef = useRef(false);

  // recado das telas de entrar ("Você entrou…") ou da /conta ("Conta excluída."): uma vez só
  useEffect(() => {
    const entrou = consumirEntrada();
    const recado = pegarRecado();
    /* o ToastProvider do layout pode ter acabado de montar junto e só assina no
       efeito dele, depois deste; o gerente segura os avisos até lá (ui/toast). */
    if (entrou) toast.mostrar(fraseDeEntrada(entrou), { id: "entrada" });
    if (recado) toast.mostrar(recado, { id: "recado" });
  }, [toast]);

  // sessão velha (401) sai sozinha; offline não desloga
  useEffect(() => {
    if (sessao) void validarSessaoEmSegundoPlano();
  }, [sessao]);

  function abrirConvite(vencida?: { email: string }) {
    setAviso(vencida ? SESSAO_VENCEU : null);
    setAba(vencida ? "entrar" : "criar");
    if (vencida) setEmailConvite(vencida.email);
    setConvite(true);
  }

  async function baixar() {
    if (gerandoRef.current) return;
    const atual = lerSessao();
    if (!atual) {
      abrirConvite(sessaoVencida() ?? undefined);
      return;
    }
    gerandoRef.current = true;
    setGerando(true);
    try {
      const conferida = await confirmarSessaoNoServidor();
      if (conferida.tipo === "sem-sessao") {
        // a sessão venceu no relógio entre o toque e a conferência
        abrirConvite(sessaoVencida() ?? undefined);
        return;
      }
      if (conferida.tipo === "expirada") {
        // a própria conferência já tirou a sessão (se ainda era a mesma)
        abrirConvite({ email: atual.email });
        return;
      }
      if (conferida.tipo === "falhou") {
        toast.mostrar(NAO_CONFERIU, { id: ID_TOAST_PDF });
        return;
      }

      const resultado = await gerarPdfDoPlano({ ...entrada, sessao: conferida.sessao });
      if (resultado.tipo === "arquivo") {
        baixarArquivo(resultado.arquivo, resultado.nome);
      } else {
        toast.mostrar(
          "O PDF chega na próxima atualização do dindin. Sua conta já está pronta: quando ele chegar, é só tocar aqui.",
          { id: ID_TOAST_PDF, duracao: 8000 },
        );
      }
    } catch (erro) {
      // a geração vai poder ir ao servidor com o Bearer: 401 = sessão vencida, a pessoa entra de novo
      if (erro instanceof ApiError && erro.status === 401) {
        sair();
        abrirConvite({ email: atual.email });
      } else {
        toast.mostrar(mensagemDeErro(erro), { id: ID_TOAST_PDF });
      }
    } finally {
      gerandoRef.current = false;
      setGerando(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => void baixar()}
        aria-disabled={gerando || undefined}
        aria-describedby={sessao ? undefined : "pdf-precisa-conta"}
        className={cn(ctaClasses("primary", "lg"), "w-full sm:w-auto sm:justify-self-start", gerando && "opacity-70")}
      >
        <FileDown aria-hidden="true" className="size-5" />
        {gerando ? "Preparando…" : "Baixar PDF"}
      </button>
      {!sessao && (
        <p id="pdf-precisa-conta" className="text-sm text-muted-foreground">
          Precisa de uma conta grátis (e-mail e senha).
        </p>
      )}

      <ConviteConta
        open={convite}
        onOpenChange={setConvite}
        aba={aba}
        onAbaChange={setAba}
        email={emailConvite}
        onEmailChange={setEmailConvite}
        aviso={aviso}
        onEntrou={(como, email) => {
          toast.mostrar(fraseDeEntrada({ email, como }), { id: "entrada" });
          setConvite(false);
          void baixar();
        }}
        onBaixar={() => {
          setConvite(false);
          void baixar();
        }}
      />
    </div>
  );
}
