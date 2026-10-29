import { catalog, classNameFor, type DeckId } from "../lib/cards";
import { summonerRules } from "../lib/expansion-cards";
import { CardText } from "./card-text";
import { CardZoom } from "./card-zoom";

export function DeckPreview({ deck }: { deck: DeckId }) {
 return <details key={deck} className={"deck-preview deck-" + deck}>
  <summary>Ver cartas de {classNameFor(deck)}</summary>
  {deck === "summoner" && <div className="class-rules"><p>As invocações agem já na rodada em que entram e permanecem visíveis entre rodadas. Estas regras não são cartas da mão:</p><ul>{summonerRules.map(rule => <li key={rule}>{rule}</li>)}</ul></div>}
  <div className="hand-cards">{catalog[deck].map(card => <CardZoom key={card.id} side={1} deck={deck} caption="Prévia do baralho" value={<CardText card={card} />} previewValue={<CardText card={card} detailed />} focusable>
   <div className="hand-card"><CardText card={card} /></div>
  </CardZoom>)}</div>
 </details>;
}
