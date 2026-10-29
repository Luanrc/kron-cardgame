import { emptyCreatures, emptyAttackTargets, createCreature, strengthen, type Creature, type CreatureState, type AttackTargets, type AttackTarget } from "./creatures.ts";
import { definitionFor, initialLifeFor, type CardDefinition } from "./cards.ts";
import { initialResources, type ResourceBalances } from "./resources.ts";
import type { Player, Slots } from "./game";
import { emptySlotCounters, emptyFloating, validateTargets, type SlotCounters, type FloatingState } from "./targeting.ts";
import { emptyHolyPower, emptyHolySpending, holyEffectValue, type HolyPower, type HolySpending } from "./holy-power.ts";

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
 defenseUsed: Life; guaranteedDamage: Life; creatureDamageTaken: Life; creatureBleedingTaken: Life; creatureDamageDealt: Life; creatureRiposteTriggered: Record<Player, boolean>;
};
export type SlotResolution = SlotCombat & { slot: number; lifeAfter: Life; holyPowerAfter: HolyPower; holyPowerGained: HolyPower; holyPowerSpent: HolyPower; holyValue: HolyPower; resourcesAfter: ResourceBalances; resourceSpent: Life; resourceGained: Life; resourceFailed: Record<Player, boolean>; revengeDamage: Life; creaturesAfter: CreatureState; creatureEvents: string[]; attackTargets: Record<Player, AttackTarget>; bleedingApplied: { player: Player; target: number; added: number; total: number; doubled: boolean; recipient?: "player" | "creature" }[] };
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
type DamagePacket = { from: Player; to: Player; amount: number; kind: "current" | "bonus" | "bleeding"; guaranteed?: boolean; source?: AttackTarget; target?: AttackTarget };
function settleDamage(damage: Life, defense: Life, deflect: Record<Player, boolean>, reflect: Record<Player, boolean>, bleeding: Life, currentDamage: Life, guaranteedDamage: Life = { 1: 0, 2: 0 }, guaranteedDefense: Life = { 1: 0, 2: 0 }, creatures: Record<Player, Creature | null> = { 1: null, 2: null }, targets: Record<Player, AttackTarget> = { 1: "player", 2: "player" }, creatureDamage: Life = { 1: 0, 2: 0 }, creatureDefense: Life = { 1: 0, 2: 0 }, creatureBleeding: Life = { 1: 0, 2: 0 }) {
 const remainingDefense = structuredClone(defense);
 const remainingGuaranteed = structuredClone(guaranteedDefense);
 const remainingCreatureDefense = structuredClone(creatureDefense);
 const creatureBleedingTaken: Life = { 1: 0, 2: 0 };
 const creatureDamageTaken: Life = { 1: 0, 2: 0 };
 const creatureDamageDealt: Life = { 1: 0, 2: 0 };
 const usedReflection = { 1: false, 2: false };
 const damageTaken: Life = { 1: 0, 2: 0 };
 const deflected: Life = { 1: 0, 2: 0 };
 const reflected: Life = { 1: 0, 2: 0 };
 const bleedingTaken: Life = { 1: 0, 2: 0 };
 const currentDamageDealt: Life = { 1: 0, 2: 0 };
 const defenseUsed: Life = { 1: 0, 2: 0 };
 // Pending bleed consumes defense first; every point of defense is used once.
 let pending: DamagePacket[] = players.map(player => ({ from: opponent(player), to: player, amount: bleeding[player], kind: "bleeding" }));
 for (const player of players) pending.push({ from: opponent(player), to: player, amount: creatureBleeding[player], kind: "bleeding", target: "creature" });
 for (const player of players) {
  const target = targets[player] === "creature" && creatures[opponent(player)] ? "creature" : "player";
  pending.push({ from: player, to: opponent(player), amount: currentDamage[player] - guaranteedDamage[player], kind: "current", target });
  pending.push({ from: player, to: opponent(player), amount: guaranteedDamage[player], kind: "current", guaranteed: true, target });
  pending.push({ from: player, to: opponent(player), amount: damage[player] - currentDamage[player] - creatureDamage[player], kind: "bonus", target });
  pending.push({ from: player, to: opponent(player), amount: creatureDamage[player], kind: "current", source: "creature", target });
 }
 // Initial damage plus at most two reflections: finite and symmetric.
 for (let wave = 0; wave < 3 && pending.some(packet => packet.amount); wave++) {
  const next: DamagePacket[] = [];
  for (const player of players) {
   const canReflect = reflect[player] && !usedReflection[player];
   for (const packet of pending.filter(packet => packet.to === player)) {
    if (packet.target === "creature" && creatures[player]) {
     const blocked = packet.guaranteed ? 0 : Math.min(packet.amount, remainingCreatureDefense[player]);
     remainingCreatureDefense[player] -= blocked;
     const amount = packet.amount - blocked;
     creatureDamageTaken[player] += amount;
     if (packet.kind === "bleeding") creatureBleedingTaken[player] += amount;
     if (packet.from !== player) {
      if (packet.source === "creature") creatureDamageDealt[packet.from] += amount;
      else if (packet.kind === "current") currentDamageDealt[packet.from] += amount;
     }
     continue;
    }
    const blocked = Math.min(packet.amount, packet.guaranteed ? remainingGuaranteed[player] : remainingDefense[player]);
    remainingDefense[player] -= blocked;
    remainingGuaranteed[player] = packet.guaranteed ? remainingGuaranteed[player] - blocked : Math.min(remainingGuaranteed[player], remainingDefense[player]);
    defenseUsed[player] += blocked;
    const amount = packet.amount - blocked;
    if (!amount) continue;
    if (deflect[player]) deflected[player] += amount;
    else if (packet.kind !== "bleeding" && canReflect) {
     usedReflection[player] = true;
     reflected[player] += amount;
     next.push({ ...packet, to: opponent(player), amount, target: packet.source === "creature" ? "creature" : "player" });
    } else {
     damageTaken[player] += amount;
     if (packet.kind === "bleeding") bleedingTaken[player] += amount;
     if (packet.kind === "current" && player !== packet.from) {
      if (packet.source === "creature") creatureDamageDealt[packet.from] += amount;
      else currentDamageDealt[packet.from] += amount;
     }
    }
   }
  }
  pending = next;
 }
 return { damageTaken, deflected, reflected, bleedingTaken, currentDamageDealt, defenseUsed, creatureDamageTaken, creatureDamageDealt, creatureBleedingTaken };
}

export function resolveSlot(cards: Record<Player, CardDefinition | undefined>, incoming = emptyBonuses(), reflectionFromNextSlot: Record<Player, boolean> = { 1: false, 2: false }, context: { bleeding?: Life; floatingDamage?: Life; floatingDefense?: Life; creatures?: Record<Player, Creature | null>; attackTargets?: Record<Player, AttackTarget>; creatureBleeding?: Life } = {}): SlotCombat {
 const stunned: Record<Player, boolean> = {
  1: !!cards[2]?.effects.some(effect => effect.kind === "stun"),
  2: !!cards[1]?.effects.some(effect => effect.kind === "stun"),
 };
 const creatures = context.creatures ?? { 1: null, 2: null };
 const targets = context.attackTargets ?? { 1: "player", 2: "player" };
 const creatureDamage: Life = { 1: 0, 2: 0 };
 const creatureDefense: Life = { 1: 0, 2: 0 };
 const creatureRiposte = { 1: false, 2: false };
 const creatureRiposteTriggered = { 1: false, 2: false };
 for (const player of players) {
  const creature = creatures[player];
  if (!creature || stunned[player]) continue;
  creatureDefense[player] = creature.defense + creature.temporaryDefense;
  creatureRiposte[player] = creature.riposte;
  if (!creature.riposte) creatureDamage[player] = creature.damage + creature.temporaryDamage;
 }
 const current = emptyBonuses();
 const outgoing = emptyBonuses();
 const guaranteedDamage: Life = { 1: 0, 2: 0 };
 const guaranteedDefense: Life = { 1: 0, 2: 0 };
 const riposte: Record<Player, boolean> = { 1: false, 2: false };
 for (const player of players) {
  if (stunned[player]) continue;
  const card = cards[player];
  riposte[player] = card?.damageCondition === "opponent_deals_damage";
  for (const effect of card?.effects ?? []) {
   if (effect.kind !== "damage" && effect.kind !== "defense") continue;
   if ((effect.delay ?? 0) > 1) continue;
   if (effect.kind === "damage" && card?.floating?.effect === "damage") continue;
   const target = effect.slot === "next" ? outgoing[player] : current[player];
   target[effect.kind] += effect.amount;
   if (effect.slot === "current" && effect.kind === "damage" && effect.guaranteed) guaranteedDamage[player] += effect.amount;
   if (effect.slot === "current" && effect.kind === "defense" && card?.blocksGuaranteed) guaranteedDefense[player] += effect.amount;
  }
 }
 const defense: Life = { 1: incoming[1].defense + current[1].defense + (context.floatingDefense?.[1] ?? 0), 2: incoming[2].defense + current[2].defense + (context.floatingDefense?.[2] ?? 0) };
 for (const player of players) {
  if (stunned[player]) continue;
  if (cards[player]?.halfGuaranteed) guaranteedDamage[player] += Math.floor(current[player].damage / 2);
  if (cards[player]?.damageRule?.kind === "zero_if_defense" && (targets[player] === "creature" && creatures[opponent(player)] ? creatureDefense[opponent(player)] : defense[opponent(player)]) > 0) current[player].damage = 0;
 }
 const damage: Life = {
  1: incoming[1].damage + (context.floatingDamage?.[1] ?? 0) + (riposte[1] ? 0 : current[1].damage) + creatureDamage[1],
  2: incoming[2].damage + (context.floatingDamage?.[2] ?? 0) + (riposte[2] ? 0 : current[2].damage) + creatureDamage[2],
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
 const currentDealt = (): Life => ({ 1: riposte[1] && !riposteTriggered[1] ? 0 : current[1].damage, 2: riposte[2] && !riposteTriggered[2] ? 0 : current[2].damage });
 const settle = () => settleDamage(damage, defense, deflect, reflect, bleeding, currentDealt(), guaranteedDamage, guaranteedDefense, creatures, targets, creatureDamage, creatureDefense, context.creatureBleeding);
 const bothReactive = (riposte[1] || creatureRiposte[1]) && (riposte[2] || creatureRiposte[2]);
 const boosted = { 1: false, 2: false };
 // Each reaction activates once, using a shared simultaneous snapshot.
 for (let pass = 0; pass < 7; pass++) {
  const preview = settle();
  let changed = false;
  for (const player of players) {
   if (!bothReactive && riposte[player] && !riposteTriggered[player] && preview.damageTaken[player] > 0) {
    riposteTriggered[player] = true; damage[player] += current[player].damage; changed = true;
   }
   if (!bothReactive && creatureRiposte[player] && !creatureRiposteTriggered[player] && preview.creatureDamageTaken[player] > 0) {
    creatureRiposteTriggered[player] = true;
    creatureDamage[player] = creatures[player]!.damage + creatures[player]!.temporaryDamage;
    damage[player] += creatureDamage[player]; changed = true;
   }
   const rule = cards[player]?.damageRule;
   if (stunned[player] || boosted[player] || rule?.kind !== "if_hit" || preview.damageTaken[player] <= 0) continue;
   boosted[player] = true; damage[player] += rule.amount - current[player].damage; current[player].damage = rule.amount; changed = true;
  }
  if (!changed) break;
 }
 for (const player of players) if (cards[player]?.nextSlotCondition === "riposte_triggered" && !riposteTriggered[player]) outgoing[player] = { damage: 0, defense: 0 };

 return {
  damage, defense, ...settle(), guaranteedDamage,
  stunned, riposteTriggered, creatureRiposteTriggered, incoming: structuredClone(incoming), outgoing,
 };
}

export function resolveBattle(slots: Record<Player, Slots>, startingLife: Life, options: { bleeding?: SlotCounters; floating?: FloatingState; holyPower?: HolyPower; holySpending?: HolySpending; resources?: ResourceBalances; creatures?: CreatureState; attackTargets?: AttackTargets } = {}): { life: Life; result: MatchResult; log: SlotResolution[]; bleeding: SlotCounters; holyPower: HolyPower; resources: ResourceBalances; rageNext: Record<Player, boolean>; premonitionNext: Record<Player, boolean>; creatures: CreatureState } {
 let life = structuredClone(startingLife);
 let result = resultFor(life);
 let incoming = emptyBonuses();
 const log: SlotResolution[] = [];
 const cardAt = (player: Player, slot: number) => slots[player][slot] ? definitionFor(player, slots[player][slot]!) : undefined;

 const bleeding = options.bleeding ?? emptySlotCounters();
 const nextBleeding = emptySlotCounters();
 const floating = options.floating ?? emptyFloating();
 const floatingDamage = emptySlotCounters();
 const floatingDefense = emptySlotCounters();
 const delayedDamage = emptySlotCounters();
 const delayedDefense = emptySlotCounters();
 const holyPower = structuredClone(options.holyPower ?? emptyHolyPower());
 const holySpending = options.holySpending ?? emptyHolySpending();
 const inferredDecks = { 1: slots[1].map(id => id && definitionFor(1, id)?.classId).find(Boolean) || "warrior", 2: slots[2].map(id => id && definitionFor(2, id)?.classId).find(Boolean) || "warrior" } as Record<Player, import("./cards.ts").DeckId>;
 const resources = structuredClone(options.resources ?? initialResources(inferredDecks));
 const creatures = structuredClone(options.creatures ?? emptyCreatures());
 const attackTargets = options.attackTargets ?? emptyAttackTargets();
 const creatureBleeding = emptySlotCounters();
 for (const side of players) for (let index = 0; index < 5; index++) {
  if (creatures[side][index]) { creatureBleeding[side][index] = creatures[side][index]!.bleeding; creatures[side][index]!.bleeding = 0; }
 }
 const ammoSpent: Life = { 1: 0, 2: 0 };
 const defendedTotal: Life = { 1: 0, 2: 0 };
 const rageNext = { 1: false, 2: false };
 const premonitionNext = { 1: false, 2: false };
 for (const player of players) {
  for (let source = 0; source < 5; source++) {
   const card = cardAt(player, source);
   if (!card?.floating) continue;
   const targets = floating[player][slots[player][source]!] ?? Array(card.floating.points).fill(source);
   validateTargets(card, source, targets);
   if (card.floating.effect !== "damage" || cardAt(opponent(player), source)?.effects.some(effect => effect.kind === "stun")) continue;
   for (const target of targets) floatingDamage[player][target] += 1;
  }
 }
 for (let slot = 0; slot < 5 && !result; slot++) {
  for (const player of players) {
   incoming[player].damage += delayedDamage[player][slot];
   incoming[player].defense += delayedDefense[player][slot];
  }
  const holyPowerSpent = emptyHolyPower();
  const holyPowerGained = emptyHolyPower();
  const holyValue = emptyHolyPower();
  const activeCards: Record<Player, CardDefinition | undefined> = { 1: cardAt(1, slot), 2: cardAt(2, slot) };
  const resourceSpent: Life = { 1: 0, 2: 0 };
  const resourceGained: Life = { 1: 0, 2: 0 };
  const resourceFailed = { 1: false, 2: false };
  for (const player of players) {
   const rule = activeCards[player]?.resource;
   if (rule?.cost && (resources[rule.kind][player] < rule.cost || (rule.kind === "ammo" && ammoSpent[player] + rule.cost > 4))) {
    activeCards[player] = undefined; resourceFailed[player] = true;
   }
  }
  const willBeStunned = (player: Player) => !!activeCards[opponent(player)]?.effects.some(effect => effect.kind === "stun");
  for (const player of players) {
   const rule = activeCards[player]?.resource;
   if (rule?.cost && !willBeStunned(player)) {
    resources[rule.kind][player] -= rule.cost;
    resourceSpent[player] = rule.cost;
    if (rule.kind === "ammo") ammoSpent[player] += rule.cost;
   }
  }
  const creatureEvents: string[] = [];
  for (const player of players) {
   const card = activeCards[player];
   if (willBeStunned(player)) continue;
   if (card?.summon && !creatures[player][slot]) {
    creatures[player][slot] = createCreature(card, slots[player][slot]!);
    creatureEvents.push(`Player ${player}: invocou ${card.summon.creature === "wolf" ? "Lobo" : "Urso"}`);
   }
   if (card?.fortify && creatures[player][slot]) {
    strengthen(creatures[player][slot]!, card);
    creatureEvents.push(`Player ${player}: fortaleceu a criatura`);
   }
  }
  for (const player of players) {
   const card = activeCards[player];
   if (card?.damageRule?.kind === "lost_life") {
    const max = initialLifeFor(card.classId);
    activeCards[player] = { ...card, effects: [...card.effects, { kind: "damage", amount: Math.floor(Math.max(0, max - life[player]) / card.damageRule.divisor), slot: "current" }] };
   }
  }
  for (const player of players) {
   const card = activeCards[player];
   if (!card?.holyPower?.scaling || willBeStunned(player)) continue;
   holyPowerSpent[player] = Math.min(holySpending[player][slots[player][slot]!] ?? 0, holyPower[player]);
   holyPower[player] -= holyPowerSpent[player];
   holyValue[player] = holyEffectValue(holyPowerSpent[player]);
   if (card.holyPower.scaling === "defense" && card.floating) {
    const target = floating[player][slots[player][slot]!]?.[0] ?? slot;
    floatingDefense[player][target] += holyValue[player];
   } else activeCards[player] = { ...card, effects: [...card.effects, { kind: "damage", amount: holyValue[player], slot: "current" }] };
  }
  const slotContext = { creatureBleeding: { 1: creatureBleeding[1][slot], 2: creatureBleeding[2][slot] }, creatures: { 1: creatures[1][slot], 2: creatures[2][slot] }, attackTargets: { 1: attackTargets[1][slot], 2: attackTargets[2][slot] }, bleeding: { 1: bleeding[1][slot], 2: bleeding[2][slot] }, floatingDamage: { 1: floatingDamage[1][slot], 2: floatingDamage[2][slot] }, floatingDefense: { 1: floatingDefense[1][slot], 2: floatingDefense[2][slot] } };
  // Arcane generation is evaluated independently of Reflect, per the class rule.
  // This also makes next-slot spell affordability independent of retroactive reflection.
  const evaluateResources = () => resolveSlot(Object.fromEntries(players.map(player => [player, activeCards[player] && { ...activeCards[player], effects: activeCards[player]!.effects.filter(effect => effect.kind !== "reflect") }])) as Record<Player, CardDefinition | undefined>, incoming, { 1: false, 2: false }, slotContext);
  const resourcePreview = evaluateResources();
  const projectedResources = structuredClone(resources);
  for (const player of players) {
   const rule = activeCards[player]?.resource;
   if (!rule || resourcePreview.stunned[player] || (rule.gainCondition === "no_damage_taken" && resourcePreview.damageTaken[player] > 0)) continue;
   projectedResources[rule.kind][player] = rule.fill ? 6 : Math.min(rule.kind === "ammo" ? 6 : Number.MAX_SAFE_INTEGER, projectedResources[rule.kind][player] + (rule.gain ?? 0));
  }
  const reflectionAt = (player: Player, source: number) => {
   const mirror = cardAt(player, source);
   if (!mirror?.effects.some(effect => effect.kind === "reflect")) return false;
   const attacker = opponent(player);
   const nextCard = cardAt(attacker, source);
   if (!nextCard?.effects.some(effect => effect.kind === "stun")) return true;
   const cost = nextCard.resource;
   return !!cost?.cost && projectedResources[cost.kind][attacker] < cost.cost;
  };
  const evaluateSlot = () => resolveSlot(activeCards, incoming, { 1: reflectionAt(1, slot + 1), 2: reflectionAt(2, slot + 1) }, slotContext);
  let combat = evaluateSlot();
  const revengeDamage: Life = { 1: 0, 2: 0 };
  // Both Vingar effects read the same pre-retaliation snapshot, without recursive amplification.
  for (const player of players) {
   const card = activeCards[player];
   if (!card?.revenge || combat.stunned[player]) continue;
   revengeDamage[player] = Math.floor((defendedTotal[player] + combat.defenseUsed[player]) / 2);
   activeCards[player] = { ...card, effects: [...card.effects, { kind: "damage", amount: revengeDamage[player], slot: "current" }] };
  }
  if (revengeDamage[1] || revengeDamage[2]) combat = evaluateSlot();
  const resourceCombat = evaluateResources();
  for (const player of players) {
   defendedTotal[player] += combat.defenseUsed[player];
   const card = activeCards[player];
   if (!card || combat.stunned[player]) continue;
   if (card.rage) rageNext[player] = true;
   if (card.premonition) premonitionNext[player] = true;
   const rule = card.resource;
   if (!rule || (rule.gainCondition === "no_damage_taken" && resourceCombat.damageTaken[player] > 0)) continue;
   const before = resources[rule.kind][player];
   resources[rule.kind][player] = rule.fill ? 6 : Math.min(rule.kind === "ammo" ? 6 : Number.MAX_SAFE_INTEGER, before + (rule.gain ?? 0));
   resourceGained[player] = resources[rule.kind][player] - before;
  }
  for (const player of players) {
   const card = activeCards[player];
   if (!card?.holyPower?.gain || combat.stunned[player]) continue;
   const hasAttack = card.effects.some(effect => effect.kind === "damage" && effect.slot === "current");
   const hasDefense = card.effects.some(effect => effect.kind === "defense" && effect.slot === "current");
   if ((!hasAttack && !hasDefense) || (hasAttack && combat.currentDamageDealt[player] > 0) || (hasDefense && combat.defenseUsed[player] > 0)) {
    holyPowerGained[player] = card.holyPower.gain;
    holyPower[player] += holyPowerGained[player];
   }
  }
  const bleedingApplied: SlotResolution["bleedingApplied"] = [];
  for (const player of players) {
   const card = activeCards[player];
   if (!card?.bleeding || combat.stunned[player] || combat.currentDamageDealt[player] <= 0) continue;
   const target = card.floating?.effect === "bleeding" ? floating[player][slots[player][slot]!]?.[0] ?? slot : slot;
   const recipient = opponent(player);
   const creature = attackTargets[player][target] === "creature" ? creatures[recipient][target] : null;
   const before = creature ? creature.bleeding : nextBleeding[recipient][target];
   const total = (before + card.bleeding.amount) * (card.bleeding.doubleAfterAdding ? 2 : 1);
   if (creature) creature.bleeding = total;
   else nextBleeding[recipient][target] = total;
   bleedingApplied.push({ player: recipient, target: target + 1, added: total - before, total, doubled: !!card.bleeding.doubleAfterAdding, ...(creature ? { recipient: "creature" as const } : {}) });
  }
  for (const player of players) {
   const card = activeCards[player];
   if (combat.stunned[player]) continue;
   for (const effect of card?.effects ?? []) {
    if ((effect.kind !== "damage" && effect.kind !== "defense") || (effect.delay ?? 0) <= 1) continue;
    const target = slot + effect.delay!;
    if (target < 5) (effect.kind === "damage" ? delayedDamage : delayedDefense)[player][target] += effect.amount;
   }
  }
  for (const player of players) {
   const creature = creatures[player][slot];
   if (!creature) continue;
   creature.life = Math.max(0, creature.life - combat.creatureDamageTaken[player]);
   if (!creature.life) {
    creatureEvents.push(`Player ${player}: ${creature.kind === "wolf" ? "Lobo" : "Urso"} derrotado`);
    creatures[player][slot] = null;
   }
  }
  // Apply both directions before checking defeat: no Player 1/Player 2 priority.
  life = { 1: Math.max(0, life[1] - combat.damageTaken[1]), 2: Math.max(0, life[2] - combat.damageTaken[2]) };
  log.push({ ...combat, slot: slot + 1, lifeAfter: structuredClone(life), bleedingApplied, holyPowerAfter: structuredClone(holyPower), holyPowerGained, holyPowerSpent, holyValue, resourcesAfter: structuredClone(resources), resourceSpent, resourceGained, resourceFailed, revengeDamage, creaturesAfter: structuredClone(creatures), creatureEvents, attackTargets: { 1: attackTargets[1][slot], 2: attackTargets[2][slot] } });
  result = resultFor(life);
  incoming = combat.outgoing;
 }
 // Outgoing effects from slot 5 are discarded here, never carried to another round.
 return { life, result, log, bleeding: nextBleeding, holyPower, resources, rageNext, premonitionNext, creatures };
}
