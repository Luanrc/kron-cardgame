import type { Player, RoomView } from "../lib/game";
import { creatureName, type Creature, type AttackTarget } from "../lib/creatures";

export function CreatureText({ creature }: { creature: Creature }) {
 return <span className="creature-copy">
  <strong>{creatureName(creature)}</strong>
  <span>Vida {creature.life}/{creature.maxLife}</span>
  <span>+{creature.damage + creature.temporaryDamage} dano{creature.riposte ? " · Ripostar" : ""}</span>
  {(creature.defense + creature.temporaryDefense) > 0 && <span>+{creature.defense + creature.temporaryDefense} def</span>}
  {creature.bleeding > 0 && <span className="creature-bleeding">Sangramento {creature.bleeding}</span>}
 </span>;
}

export function AttackTargetPanel({ room, player, locked, onTarget }: { room: RoomView; player: Player; locked: boolean; onTarget: (slot: number, target: AttackTarget) => void }) {
 const opponent: Player = player === 1 ? 2 : 1;
 if (room.decks[opponent] !== "summoner") return null;
 return <fieldset className="attack-target-panel" disabled={locked}>
  <legend>Alvos dos ataques</legend>
  <p className="hint">Escolha antes de Pronto. O alvo vale para o dano e os novos efeitos de Sangramento nesse slot. Se não houver criatura, o ataque atinge o jogador. Sangramento já aplicado permanece na vítima original.</p>
  <div className="floating-choices">{[0, 1, 2, 3, 4].map(slot => <label key={slot}>Slot {slot + 1}{room.creatures[opponent][slot] && " · " + creatureName(room.creatures[opponent][slot]!)}
   <select aria-label={"Alvo do slot " + (slot + 1)} value={room.attackTargets[player]?.[slot] ?? "player"} onChange={event => onTarget(slot, event.target.value as AttackTarget)}>
    <option value="player">Jogador</option><option value="creature">Criatura, se houver</option>
   </select>
  </label>)}</div>
 </fieldset>;
}
