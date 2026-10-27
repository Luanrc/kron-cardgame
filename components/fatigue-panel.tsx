import { definitionFor, classNameFor } from "../lib/cards";
import type { FatigueView } from "../lib/game";
import { CardZoom } from "./card-zoom";
import { CardText } from "./card-text";

export function FatiguePanel({ fatigue }: { fatigue: FatigueView[] }) {
 return <div className="fatigue-panel" aria-label="Cartas em fadiga">
  <h3>Cartas em Fadiga</h3>
  <p className="hint">Visível para todos. A Fadiga bloqueia as rodadas seguintes ao uso; a volta à mão é automática.</p>
  <div className="fatigue-columns">
   {fatigue.map(side => <div key={side.player} className={"fatigue-side player-" + side.player} role="group" aria-label={"Fadiga do Player " + side.player}>
    <h4>Player {side.player}</h4>
    {side.cards.length === 0 ? <p className="hint">Nenhuma carta em Fadiga.</p> : <ul>
     {side.cards.map(entry => {
      const card = definitionFor(side.player, entry.card)!;
      return <li key={entry.card}>
       <CardZoom side={side.player} deck={card.classId} value={<CardText card={card} />} previewValue={<CardText card={card} detailed />} caption={"Player " + side.player + " · Em Fadiga"} focusable>
        <div className="fatigue-entry">
         <strong>{classNameFor(card.classId)} · {String(card.number).padStart(2, "0")}</strong>
         <span>{card.text.main.join(" ")}</span>
         <span className="fatigue-count">{entry.remainingRounds === 1 ? "Resta 1 rodada" : "Restam " + entry.remainingRounds + " rodadas"} · Volta na rodada {entry.availableRound}</span>
        </div>
       </CardZoom>
      </li>;
     })}
    </ul>}
   </div>)}
  </div>
 </div>;
}
