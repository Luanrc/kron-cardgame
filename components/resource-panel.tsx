import { definitionFor } from "../lib/cards";
import { plannedAmmo } from "../lib/resources";
import type { Player, RoomView } from "../lib/game";

export function ResourcePanel({ room, player }: { room: RoomView; player: Player }) {
 const deck = room.decks[player];
 if (deck !== "gunner" && deck !== "mage") return null;
 return <div className="resource-status" aria-label="Recursos da rodada">
  {deck === "gunner" ? <p>Munição: <strong>{room.resources.ammo[player]}/6</strong> · Gasto programado: <strong>{plannedAmmo(player, room.ownSlots)}/4</strong> nesta rodada.</p> : <p>Recurso Arcano: <strong>{room.resources.arcane[player]}</strong>.</p>}
  <p className="hint">Os custos são fixos. Recursos são consumidos quando a carta age, mesmo que o ataque seja bloqueado. Atordoamento impede o gasto. Ganhos anteriores podem financiar cartas seguintes; se um ganho condicional falhar, uma carta sem saldo não age.</p>
  {room.ownSlots.some(id => id && definitionFor(player, id)?.resource?.cost) && <ul>{room.ownSlots.map((id, slot) => {
   const card = id && definitionFor(player, id);
   return card && card.resource?.cost ? <li key={slot}>Slot {slot + 1} · Carta {card.number} · Custo {card.resource.cost} {deck === "gunner" ? "munição" : "arcano"}</li> : null;
  })}</ul>}
 </div>;
}

export function PremonitionPanel({ room, player, busy, onChoose }: { room: RoomView; player: Player; busy: boolean; onChoose: (slot: number) => void }) {
 if (room.revealed) return null;
 const opponent: Player = player === 1 ? 2 : 1;
 const ownVision = room.visions[player];
 const enemyVision = room.visions[opponent];
 return <>
  {ownVision?.round === room.round && <p className="notice" role="status">{ownVision.slot === null ? "Premonição: aguardando o adversário escolher um slot para Não age." : `Premonição: o slot ${ownVision.slot + 1} do adversário contém uma carta Não age e está travado nesta rodada.`}</p>}
  {enemyVision?.round === room.round && (enemyVision.slot === null ? <div className="premonition-choice">
   <h3>Premonição adversária</h3><p>Antes de preparar suas cartas, escolha um slot para uma carta Não age. O Mago verá essa posição; ela ficará travada nesta rodada.</p>
   <div className="buttons">{[0, 1, 2, 3, 4].map(slot => <button key={slot} disabled={busy || !!room.result || !!room.creatures[player][slot]} className="secondary" onClick={() => onChoose(slot)}>Escolher slot {slot + 1}</button>)}</div>
  </div> : <p className="hint">Premonição: sua carta Não age no slot {enemyVision.slot + 1} está revelada ao Mago e travada nesta rodada.</p>)}
 </>;
}
