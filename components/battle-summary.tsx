import type { RoomView } from "../lib/game";
import { classNameFor } from "../lib/cards";

export function LifePool({ room }: { room: RoomView }) {
 return <div className="life-pools" aria-label="Vida dos jogadores">
  {([1, 2] as const).map(player => <div key={player} className={"life-pool player-" + player} aria-label={"Vida do Player " + player}>
   <span>Player {player} · {classNameFor(room.decks[player])}</span><strong>{room.life[player]} <small>/ {room.initialLife} de vida</small></strong>
  </div>)}
 </div>;
}
export function BattleSummary({ room }: { room: RoomView }) {
 return <>
  {room.result && <p className="match-result" role="alert">{room.result.type === "draw" ? "Empate! Os dois jogadores chegaram a zero no mesmo slot." : "Player " + room.result.winner + " venceu a partida!"}</p>}
  {room.battle.length > 0 && <div className="battle-summary" aria-label="Resultado dos confrontos">
   <h3>Confrontos da rodada</h3>
   <div className="table-scroll"><table>
    <caption>Dano sofrido e vida restante após cada slot</caption>
    <thead><tr><th>Slot</th><th>Player 1</th><th>Player 2</th><th>Efeitos</th></tr></thead>
    <tbody>{room.battle.map(slot => <tr key={slot.slot}>
     <th scope="row">{slot.slot}</th>
     <td>−{slot.damageTaken[1]} de vida · {slot.lifeAfter[1]} {slot.lifeAfter[1] === 1 ? "restante" : "restantes"}</td>
     <td>−{slot.damageTaken[2]} de vida · {slot.lifeAfter[2]} {slot.lifeAfter[2] === 1 ? "restante" : "restantes"}</td>
     <td>{[slot.stunned[1] && "Player 1 atordoado", slot.stunned[2] && "Player 2 atordoado", slot.riposteTriggered[1] && "Player 1 ripostou", slot.riposteTriggered[2] && "Player 2 ripostou", slot.deflected?.[1] && "Player 1 defletiu " + slot.deflected[1], slot.deflected?.[2] && "Player 2 defletiu " + slot.deflected[2], slot.reflected?.[1] && "Player 1 refletiu " + slot.reflected[1], slot.reflected?.[2] && "Player 2 refletiu " + slot.reflected[2], slot.bleedingTaken?.[1] && "Player 1 sofreu " + slot.bleedingTaken[1] + " de Sangramento", slot.bleedingTaken?.[2] && "Player 2 sofreu " + slot.bleedingTaken[2] + " de Sangramento", ...(slot.bleedingApplied ?? []).map(mark => "Player " + mark.player + ", slot " + mark.target + ": +" + mark.added + " Sangramento" + (mark.doubled ? " (duplicado)" : ""))].filter(Boolean).join(" · ") || "—"}</td>
    </tr>)}</tbody>
   </table></div>
   {room.result && <p className="hint">A partida terminou no slot {room.battle.at(-1)?.slot}.{room.battle.length < 5 && " Os slots seguintes não foram resolvidos."}</p>}
  </div>}
 </>;
}
