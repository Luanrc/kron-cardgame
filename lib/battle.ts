import { definitionFor, type CardDefinition } from "./cards.ts";
import type { Player, Slots } from "./game";
import { emptySlotCounters, emptyFloating, type SlotCounters, type FloatingState } from "./targeting.ts";

export const INITIAL_LIFE = 10;
export type Life = Record<Player, number>;
export type MatchResult = { type: "win"; winner: Player } | { type: "draw" } | null;
export type Bonus = { damage: number; defense: number };
export type SlotCombat = {
 damage: Life; defense: Life; damageTaken: Life;
 stunned: Record<Player, boolean>; riposteTriggered: Record<Player, boolean>;
 incoming: Record<Player, Bonus>; outgoing: Record<Player, Bonus>;
 deflected: Life; reflected: Life;
 bleedingTaken: Life; currentDamageDealt: Life;
};
export type SlotResolution = SlotCombat & { slot: number; lifeAfter: Life; bleedingApplied: { player: Player; target: number; added: number; total: number; doubled: boolean }[] };
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
type DamagePacket = { from: Player; to: Player; amount: number; kind: "current" | "bonus" | "bleeding" };
function settleDamage(damage: Life, defense: Life, deflect: Record<Player, boolean>, reflect: Record<Player, boolean>, bleeding: Life, currentDamage: Life) {
 const remainingDefense = structuredClone(defense);
 const usedReflection = { 1: false, 2: false };
 const damageTaken: Life = { 1: 0, 2: 0 };
 const deflected: Life = { 1: 0, 2: 0 };
 const reflected: Life = { 1: 0, 2: 0 };
 const bleedingTaken: Life = { 1: 0, 2: 0 };
 const currentDamageDealt: Life = { 1: 0, 2: 0 };
 // Pending bleed consumes defense first; every point of defense is used once.
 let pending: DamagePacket[] = players.map(player => ({ from: opponent(player), to: player, amount: bleeding[player], kind: "bleeding" }));
 for (const player of players) {
  pending.push({ from: player, to: opponent(player), amount: currentDamage[player], kind: "current" });
  pending.push({ from: player, to: opponent(player), amount: damage[player] - currentDamage[player], kind: "bonus" });
 }
 // Initial damage plus at most two reflections: finite and symmetric.
 for (let wave = 0; wave < 3 && pending.some(packet => packet.amount); wave++) {
  const next: DamagePacket[] = [];
  for (const player of players) {
   const canReflect = reflect[player] && !usedReflection[player];
   for (const packet of pending.filter(packet => packet.to === player)) {
    const blocked = Math.min(packet.amount, remainingDefense[player]);
    remainingDefense[player] -= blocked;
    const amount = packet.amount - blocked;
    if (!amount) continue;
    if (deflect[player]) deflected[player] += amount;
    else if (packet.kind !== "bleeding" && canReflect) {
     usedReflection[player] = true;
     reflected[player] += amount;
     next.push({ ...packet, to: opponent(player), amount });
    } else {
     damageTaken[player] += amount;
     if (packet.kind === "bleeding") bleedingTaken[player] += amount;
     if (packet.kind === "current" && player !== packet.from) currentDamageDealt[packet.from] += amount;
    }
   }
  }
  pending = next;
 }
 return { damageTaken, deflected, reflected, bleedingTaken, currentDamageDealt };
}

export function resolveSlot(cards: Record<Player, CardDefinition | undefined>, incoming = emptyBonuses(), reflectionFromNextSlot: Record<Player, boolean> = { 1: false, 2: false }, context: { bleeding?: Life; floatingDamage?: Life } = {}): SlotCombat {
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
   if (effect.kind === "damage" && card?.floating?.effect === "damage") continue;
   const target = effect.slot === "next" ? outgoing[player] : current[player];
   target[effect.kind] += effect.amount;
  }
 }
 const defense: Life = { 1: incoming[1].defense + current[1].defense, 2: incoming[2].defense + current[2].defense };
 const damage: Life = {
  1: incoming[1].damage + (context.floatingDamage?.[1] ?? 0) + (riposte[1] ? 0 : current[1].damage),
  2: incoming[2].damage + (context.floatingDamage?.[2] ?? 0) + (riposte[2] ? 0 : current[2].damage),
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
 const bleeding = context.bleeding ?? { 1: 0, 2: 0 };
 const initial = settleDamage(damage, defense, deflect, reflect, bleeding, { 1: riposte[1] ? 0 : current[1].damage, 2: riposte[2] ? 0 : current[2].damage });
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
  damage, defense, ...settleDamage(damage, defense, deflect, reflect, bleeding, { 1: riposte[1] && !riposteTriggered[1] ? 0 : current[1].damage, 2: riposte[2] && !riposteTriggered[2] ? 0 : current[2].damage }),
  stunned, riposteTriggered, incoming: structuredClone(incoming), outgoing,
 };
}

export function resolveBattle(slots: Record<Player, Slots>, startingLife: Life, options: { bleeding?: SlotCounters; floating?: FloatingState } = {}): { life: Life; result: MatchResult; log: SlotResolution[]; bleeding: SlotCounters } {
 let life = structuredClone(startingLife);
 let result = resultFor(life);
 let incoming = emptyBonuses();
 const log: SlotResolution[] = [];
 const cardAt = (player: Player, slot: number) => slots[player][slot] ? definitionFor(player, slots[player][slot]!) : undefined;
 const reflectionAt = (player: Player, slot: number) => slot < 5 && !!cardAt(player, slot)?.effects.some(effect => effect.kind === "reflect") && !cardAt(opponent(player), slot)?.effects.some(effect => effect.kind === "stun");
 const bleeding = options.bleeding ?? emptySlotCounters();
 const nextBleeding = emptySlotCounters();
 const floating = options.floating ?? emptyFloating();
 const floatingDamage = emptySlotCounters();
 for (const player of players) {
  for (let source = 0; source < 5; source++) {
   const card = cardAt(player, source);
   if (card?.floating?.effect !== "damage" || cardAt(opponent(player), source)?.effects.some(effect => effect.kind === "stun")) continue;
   const targets = floating[player][slots[player][source]!] ?? Array(card.floating.points).fill(source);
   for (const target of targets) floatingDamage[player][target] += 1;
  }
 }
 for (let slot = 0; slot < 5 && !result; slot++) {
  const combat = resolveSlot({
   1: cardAt(1, slot),
   2: cardAt(2, slot),
  }, incoming, { 1: reflectionAt(1, slot + 1), 2: reflectionAt(2, slot + 1) }, { bleeding: { 1: bleeding[1][slot], 2: bleeding[2][slot] }, floatingDamage: { 1: floatingDamage[1][slot], 2: floatingDamage[2][slot] } });
  const bleedingApplied: SlotResolution["bleedingApplied"] = [];
  for (const player of players) {
   const card = cardAt(player, slot);
   if (!card?.bleeding || combat.stunned[player] || combat.currentDamageDealt[player] <= 0) continue;
   const target = card.floating?.effect === "bleeding" ? floating[player][slots[player][slot]!]?.[0] ?? slot : slot;
   const recipient = opponent(player);
   const before = nextBleeding[recipient][target];
   nextBleeding[recipient][target] += card.bleeding.amount;
   if (card.bleeding.doubleAfterAdding) nextBleeding[recipient][target] *= 2;
   bleedingApplied.push({ player: recipient, target: target + 1, added: nextBleeding[recipient][target] - before, total: nextBleeding[recipient][target], doubled: !!card.bleeding.doubleAfterAdding });
  }
  // Apply both directions before checking defeat: no Player 1/Player 2 priority.
  life = { 1: Math.max(0, life[1] - combat.damageTaken[1]), 2: Math.max(0, life[2] - combat.damageTaken[2]) };
  log.push({ ...combat, slot: slot + 1, lifeAfter: structuredClone(life), bleedingApplied });
  result = resultFor(life);
  incoming = combat.outgoing;
 }
 // Outgoing effects from slot 5 are discarded here, never carried to another round.
 return { life, result, log, bleeding: nextBleeding };
}
