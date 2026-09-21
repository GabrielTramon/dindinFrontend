import { STORAGE_KEYS } from "@/lib/storage";

/*
  Script anti-flash do tema, renderizado dentro de <head> no root layout (padrão
  do guia preventing-flash-before-hydration do Next 16). Roda antes da primeira
  pintura e faz duas coisas: põe `html.js` (gate do utilitário `reveal`) e
  `html.dark` (tema).

  Esta é a ÚNICA leitura direta de localStorage fora de @/lib/storage: aqui
  ainda não existe React nem módulo importado — é um IIFE inline. A chave vem
  de STORAGE_KEYS (uma fonte só) e o valor passa por JSON.parse porque
  writeJSON grava JSON.stringify("dark"), com aspas. Ausente/inválido = segue
  prefers-color-scheme.
*/

const codigo = `(function(){var d=document.documentElement;d.classList.add("js");var t=null;try{var v=localStorage.getItem(${JSON.stringify(STORAGE_KEYS.tema)});t=v?JSON.parse(v):null}catch(e){}if(t!=="light"&&t!=="dark"){try{t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){t="light"}}d.classList.toggle("dark",t==="dark")})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: codigo }} />;
}
