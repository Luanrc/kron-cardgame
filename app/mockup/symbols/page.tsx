import { ClassSymbol, classSymbols } from "../../../components/class-symbol";
import { deckOptions } from "../../../lib/cards";
import "../mockup.css";

export default function Symbols() {
 return <main className="mock-symbol-sheet">
  <p className="symbol-eyebrow">KRON · ESTUDO DE SÍMBOLOS</p>
  <h1>Símbolos de classe</h1>
  <p className="symbol-intro">Símbolos aprovados para o mockup. Monge com punho fechado.</p>
  <div className="symbol-grid">{deckOptions.map(deck => <div className={"symbol-option deck-" + deck.id} key={deck.id}>
   <div className="symbol-portal"><ClassSymbol deck={deck.id} size={48} /></div>
   <h2>{deck.name}</h2><p>{classSymbols[deck.id].label}</p>
  </div>)}</div>
  <p className="symbol-footnote">Identidade provisória do protótipo: símbolos simples, com as cores de cada classe.</p>
 </main>;
}
