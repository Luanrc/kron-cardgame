import { classNameFor, type CardDefinition } from "../lib/cards";
import { compactCardText } from "../lib/card-presentation";

export function CardText({ card, detailed = false }: { card: CardDefinition; detailed?: boolean }) {
 const brief = compactCardText(card);
 const text = detailed ? card.text : brief;
 return <span className={"card-copy" + (detailed ? " card-detailed" : "")}>
  <span className="card-id">{classNameFor(card.classId)} · {String(card.number).padStart(2, "0")}</span>
  <span className="card-main">{text.main.map((line, index) => <strong key={index}>{line}</strong>)}</span>
  {text.footer.length > 0 && <span className="card-footer">{text.footer.map((line, index) => <span key={index} className={!detailed || brief.footer.includes(line) ? "effect-label" : "effect-explanation"}>{line}</span>)}</span>}
 </span>;
}
