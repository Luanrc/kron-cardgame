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
 deflected: Life; reflected: Life;
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

// Each defense point absorbs one damage across all simultaneous damage sources.
// Each player's Reflect can redirect once in this slot, including a returned attack.
function settleDamage(damage: Life, defense: Life, deflect: Record<Player, boolean>, reflect: Record<Player, boolean>) {
 const remainingDefense = structuredClone(defense);
 const usedReflection = { 1: false, 2: false };
 const damageTaken: Life = { 1: 0, 2: 0 };
 const deflected: Life = { 1: 0, 2: 0 };
 const reflected: Life = { 1: 0, 2: 0 };
 let pending: Life = { 1: damage[2], 2: damage[1] };
 // Initial damage plus at most two reflections: finite and symmetric.
 for (let wave = 0; wave < 3 && (pending[1] || pending[2]); wave++) {
  const next: Life = { 1: 0, 2: 0 };
  for (const player of players) {
   const blocked = Math.min(pending[player], remainingDefense[player]);
   remainingDefense[player] -= blocked;
   const amount = pending[player] - blocked;
   if (!amount) continue;
   if (deflect[player]) deflected[player] += amount;
   else if (reflect[player] && !usedReflection[player]) {
    usedReflection[player] = true;
    reflected[player] += amount;
    next[opponent(player)] += amount;
   } else damageTaken[player] += amount;
  }
  pending = next;
 }
 return { damageTaken, deflected, reflected };
}

export function resolveSlot(cards: Record<Player, CardDefinition | undefined>, incoming = emptyBonuses(), reflectionFromNextSlot: Record<Player, boolean> = { 1: false, 2: false }): SlotCombat {
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
 const deflect: Record<Player, boolean> = {
  1: !stunned[1] && !!cards[1]?.effects.some(effect => effect.kind === "deflect"),
  2: !stunned[2] && !!cards[2]?.effects.some(effect => effect.kind === "deflect"),
 };
 const reflect: Record<Player, boolean> = {
  1: reflectionFromNextSlot[1] || (!stunned[1] && !!cards[1]?.effects.some(effect => effect.kind === "reflect")),
  2: reflectionFromNextSlot[2] || (!stunned[2] && !!cards[2]?.effects.some(effect => effect.kind === "reflect")),
 };
 const initial = settleDamage(damage, defense, deflect, reflect);
 // Establish real, non-reactive damage first: two Ripostes cannot trigger each other.
 if (!(riposte[1] && riposte[2])) {
  for (const player of players) {
   riposteTriggered[player] = riposte[player] && initial.damageTaken[player] > 0;
  }
 }
 for (const player of players) {
  if (riposteTriggered[player]) damage[player] += current[player].damage;
  if (cards[player]?.nextSlotCondition === "riposte_triggered" && !riposteTriggered[player]) outgoing[player] = { damage: 0, defense: 0 };
 }
 return {
  damage, defense, ...settleDamage(damage, defense, deflect, reflect),
  stunned, riposteTriggered, incoming: structuredClone(incoming), outgoing,
 };
}

export function resolveBattle(slots: Record<Player, Slots>, startingLife: Life): { life: Life; result: MatchResult; log: SlotResolution[] } {
 let life = structuredClone(startingLife);
 let result = resultFor(life);
 let incoming = emptyBonuses();
 const log: SlotResolution[] = [];
 const cardAt = (player: Player, slot: number) => slots[player][slot] ? definitionFor(player, slots[player][slot]!) : undefined;
 const reflectionAt = (player: Player, slot: number) => slot < 5 && !!cardAt(player, slot)?.effects.some(effect => effect.kind === "reflect") && !cardAt(opponent(player), slot)?.effects.some(effect => effect.kind === "stun");
 for (let slot = 0; slot < 5 && !result; slot++) {
  const combat = resolveSlot({
   1: cardAt(1, slot),
   2: cardAt(2, slot),
  }, incoming, { 1: reflectionAt(1, slot + 1), 2: reflectionAt(2, slot + 1) });
  // Apply both directions before checking defeat: no Player 1/Player 2 priority.
  life = { 1: Math.max(0, life[1] - combat.damageTaken[1]), 2: Math.max(0, life[2] - combat.damageTaken[2]) };
  log.push({ ...combat, slot: slot + 1, lifeAfter: structuredClone(life) });
  result = resultFor(life);
  incoming = combat.outgoing;
 }
 // Outgoing effects from slot 5 are discarded here, never carried to another round.
 return { life, result, log };
}
