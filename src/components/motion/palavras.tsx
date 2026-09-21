import { Fragment } from "react";
import { staggerStyle } from "./stagger";

/*
  Divide o texto em palavras animáveis (utilitário rise-words no pai). O
  heading que usa isto recebe aria-label={texto}; os spans são aria-hidden.
  Só no hero e na Decisao.

  O espaço fica FORA do .word: ele é inline-block com overflow hidden, e um
  espaço no fim de um inline-block é colapsado — as palavras grudavam
  ("Seusalário, comumplano.").
*/

export function Palavras({ texto }: { texto: string }) {
  const palavras = texto.split(" ");
  return (
    <span aria-hidden="true" className="rise-words">
      {palavras.map((p, i) => (
        <Fragment key={`${i}-${p}`}>
          <span className="word">
            <span style={staggerStyle(i)}>{p}</span>
          </span>
          {i < palavras.length - 1 && " "}
        </Fragment>
      ))}
    </span>
  );
}
