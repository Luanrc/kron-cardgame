import { classNameFor, type CardDefinition } from "../lib/cards";

export function CardText({ card }: { card: CardDefinition }) {
 return <span className="card-copy">
  <span className="card-id">{classNameFor(card.classId)} · {String(card.number).padStart(2, "0")}</span>
  <span className="card-main">{card.text.main.map((line, index) => <span key={index}>{line}</span>)}</span>
  {card.text.footer.length > 0 && <span className="card-footer">{card.text.footer.map((line, index) => <span key={index}>{line}</span>)}</span>}
 </span>;
}
