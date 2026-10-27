import { definitionFor, type CardDefinition } from "./cards.ts";
import type { Player, Slots } from "./game";

export const INITIAL_LIFE = 10;
export type Life = Record<Player, number>;
export type MatchResult = { type: "win"; winner: Player } | { type: "draw" } | null;
export type Bonus = { damage: number; defense: number };
export type SlotCombat = {
 damage: Life; defense: Life; damageTaken: Life;
 stunned: Record<Player, boolean>; riposteTriggered: Record<Player, boolean>;
 incoming: Record<Player, Bonus>; outgoing: Record<Player, Bonus>;
};
export type SlotResolution = SlotCombat & { slot: number; lifeAfter: Life };
const players: Player[] = [1, 2];
const opponent = (player: Player): Player => player === 1 ? 2 : 1;
export const emptyBonuses = (): Record<Player, Bonus> => ({ 1: { damage: 0, defense: 0 }, 2: { damage: 0, defense: 0 } });
export function resultFor(life: Life): MatchResult {
 if (life[1] <= 0 && life[2] <= 0) return { type: "draw" };
 if (life[1] <= 0) return { type: "win", winner: 2 };
 if (life[2] <= 0) return { type: "win", winner: 1 };
 return null;
}

export function resolveSlot(cards: Record<Player, CardDefinition | undefined>, incoming = emptyBonuses()): SlotCombat {
 const stunned: Record<Player, boolean> = {
  1: !!cards[2]?.effects.some(effect => effect.kind === "stun"),
  2: !!cards[1]?.effects.some(effect => effect.kind === "stun"),
 };
 const current = emptyBonuses();
 const outgoing = emptyBonuses();
 const riposte: Record<Player, boolean> = { 1: false, 2: false };
 for (const player of players) {
  if (stunned[player]) continue;
  const card = cards[player];
  riposte[player] = card?.damageCondition === "opponent_deals_damage";
  for (const effect of card?.effects ?? []) {
   if (effect.kind !== "damage" && effect.kind !== "defense") continue;
   const target = effect.slot === "next" ? outgoing[player] : current[player];
   target[effect.kind] += effect.amount;
  }
 }
 const defense: Life = { 1: incoming[1].defense + current[1].defense, 2: incoming[2].defense + current[2].defense };
 const damage: Life = {
  1: incoming[1].damage + (riposte[1] ? 0 : current[1].damage),
  2: incoming[2].damage + (riposte[2] ? 0 : current[2].damage),
 };
 const riposteTriggered: Record<Player, boolean> = { 1: false, 2: false };
 // Establish real, non-reactive damage first: two Ripostes cannot trigger each other.
 if (!(riposte[1] && riposte[2])) {
  for (const player of players) {
   riposteTriggered[player] = riposte[player] && damage[opponent(player)] > defense[player];
  }
 }
 for (const player of players) if (riposteTriggered[player]) damage[player] += current[player].damage;
 return {
  damage, defense, damageTaken: { 1: Math.max(0, damage[2] - defense[1]), 2: Math.max(0, damage[1] - defense[2]) },
  stunned, riposteTriggered, incoming: structuredClone(incoming), outgoing,
 };
}

export function resolveBattle(slots: Record<Player, Slots>, startingLife: Life): { life: Life; result: MatchResult; log: SlotResolution[] } {
 let life = structuredClone(startingLife);
 let result = resultFor(life);
 let incoming = emptyBonuses();
 const log: SlotResolution[] = [];
 for (let slot = 0; slot < 5 && !result; slot++) {
  const combat = resolveSlot({
   1: slots[1][slot] ? definitionFor(1, slots[1][slot]!) : undefined,
   2: slots[2][slot] ? definitionFor(2, slots[2][slot]!) : undefined,
  }, incoming);
  // Apply both directions before checking defeat: no Player 1/Player 2 priority.
  life = { 1: Math.max(0, life[1] - combat.damageTaken[1]), 2: Math.max(0, life[2] - combat.damageTaken[2]) };
  log.push({ ...combat, slot: slot + 1, lifeAfter: structuredClone(life) });
  result = resultFor(life);
  incoming = combat.outgoing;
 }
 // Outgoing effects from slot 5 are discarded here, never carried to another round.
 return { life, result, log };
}
