import type { CardDefinition } from "./cards.ts";
import type { Player } from "./game.ts";

export type AttackTarget = "player" | "creature";
export type AttackTargets = Record<Player, AttackTarget[]>;
export type Creature = {
 kind: "wolf" | "bear"; card: string;
 life: number; maxLife: number; damage: number; defense: number; riposte: boolean;
 temporaryDamage: number; temporaryDefense: number; bleeding: number;
};
export type CreatureState = Record<Player, (Creature | null)[]>;
export const emptyCreatures = (): CreatureState => ({ 1: Array(5).fill(null), 2: Array(5).fill(null) });
export const emptyAttackTargets = (): AttackTargets => ({ 1: Array(5).fill("player"), 2: Array(5).fill("player") });
export const creatureName = (creature: Pick<Creature, "kind">) => creature.kind === "wolf" ? "Lobo" : "Urso";
export function createCreature(card: CardDefinition, instance: string): Creature {
 if (!card.summon) throw new Error("Esta carta não invoca uma criatura.");
 return { kind: card.summon.creature, card: instance, life: card.summon.life, maxLife: card.summon.life, damage: card.summon.damage, defense: card.summon.defense, riposte: !!card.summon.riposte, temporaryDamage: 0, temporaryDefense: 0, bleeding: 0 };
}
export function strengthen(creature: Creature, card: CardDefinition) {
 const rule = card.fortify;
 if (!rule) return;
 if (rule.stat === "life") { creature.maxLife += rule.amount; creature.life += rule.amount; }
 else if (rule.duration === "permanent") creature[rule.stat] += rule.amount;
 else if (rule.stat === "damage") creature.temporaryDamage += rule.amount;
 else creature.temporaryDefense += rule.amount;
}
export function creaturesForNextRound(creatures: CreatureState): CreatureState {
 const next = structuredClone(creatures);
 for (const side of [1, 2] as const) for (const creature of next[side]) {
  if (creature) { creature.temporaryDamage = 0; creature.temporaryDefense = 0; }
 }
 return next;
}
