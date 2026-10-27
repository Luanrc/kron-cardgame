import { definitionFor, classNameFor } from "../lib/cards";
import { targetSlots } from "../lib/targeting";
import type { Player, RoomView } from "../lib/game";

export function FloatingPanel({ room, player, locked, onAim }: { room: RoomView; player: Player; locked: boolean; onAim: (card: string, targets: number[]) => void }) {
 const cards = room.ownSlots.flatMap((card, slot) => card && definitionFor(player, card)?.floating ? [{ card, slot, definition: definitionFor(player, card)! }] : []);
 if (!cards.length) return null;
 return <div className="floating-panel" aria-label="Distribuir Flutuando">
  <h3>Flutuando</h3>
  <p className="hint">Escolha os destinos antes de Pronto. Defesa usa seus slots; dano e Sangramento usam os slots adversários. Suas escolhas ficam ocultas até a revelação.</p>
  {cards.map(({ card, slot, definition }) => {
   const floating = definition.floating!;
   const targets = room.floating[player][card] ?? Array(floating.points).fill(slot);
   return <fieldset key={card} disabled={locked}>
    <legend>{classNameFor(definition.classId)} {definition.number} · Slot {slot + 1} · Flutuando {floating.range}</legend>
    {floating.effect === "bleeding" && <p className="hint">O dano fica no slot {slot + 1}. Se causar dano, adiciona 1 marcador no destino e dobra os marcadores para a próxima rodada.</p>}
    <div className="floating-choices">{targets.map((target, point) => <label key={point}>
     {floating.effect === "damage" ? "Dano " + (point + 1) + " de " + floating.points : floating.effect === "defense" ? "Defesa" : "Sangramento"}
     <select aria-label={"Carta " + definition.number + " · " + (floating.effect === "damage" ? "Dano " + (point + 1) : floating.effect === "defense" ? "Defesa" : "Sangramento")} value={target} onChange={event => onAim(card, targets.map((old, index) => index === point ? Number(event.target.value) : old))}>
      {targetSlots(slot, floating.range, floating.direction).map(destination => <option key={destination} value={destination}>Slot {destination + 1}</option>)}
     </select>
    </label>)}</div>
   </fieldset>;
  })}
 </div>;
}

export function FloatingSummary({ room }: { room: RoomView }) {
 if (!room.revealed || !Object.values(room.floating).some(cards => Object.keys(cards).length)) return null;
 return <div className="floating-summary" aria-label="Flutuando revelado"><h3>Distribuição de Flutuando</h3><ul>
  {([1, 2] as Player[]).flatMap(player => Object.entries(room.floating[player]).map(([card, targets]) => {
   const definition = definitionFor(player, card)!;
   return <li key={card}>Player {player} · {classNameFor(definition.classId)} {definition.number}: {definition.floating?.effect === "damage" ? "dano nos slots " : definition.floating?.effect === "defense" ? "defesa no próprio slot " : "Sangramento no slot "}{targets.map(slot => slot + 1).join(" e ")}.</li>;
  }))}
 </ul></div>;
}
