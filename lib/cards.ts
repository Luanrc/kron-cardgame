import type { Player } from "./game";

// Definitions are shared by both decks. Instances belong to a particular player.
// Combat must consume these fields, never parse the displayed Portuguese text.
export type CardEffect =
 | { kind: "no_action" }
 | { kind: "damage" | "defense"; amount: number; slot: "current" | "next" }
 | { kind: "stun"; target: "opposing_card_same_slot" };
export type CardDefinition = {
 id: string;
 classId: "warrior";
 number: number;
 text: { main: readonly string[]; footer: readonly string[] };
 effects: readonly CardEffect[];
 damageCondition?: "opponent_deals_damage";
 fatigue?: { rounds: number; reference: "round_placed_and_revealed" };
};
export type DeckCard = { instanceId: string; definitionId: string };

export const warriorRulePolicy = {
 nextSlotOverflow: "discard",
 riposte: { requires: "actual_opponent_damage", againstRiposte: "no_effect" },
 fatigue: { unit: "round", starts: "round_after_use" },
} as const;

// Scheduling helper only; the live game does not apply combat/fatigue yet.
export const nextAvailableRound = (card: CardDefinition, usedRound: number) => usedRound + (card.fatigue?.rounds ?? 0) + 1;

export const warriorCards: readonly CardDefinition[] = [
 { id: "warrior-01", classId: "warrior", number: 1, text: { main: ["Não age"], footer: [] }, effects: [{ kind: "no_action" }] },
 { id: "warrior-02", classId: "warrior", number: 2, text: { main: ["Não age"], footer: [] }, effects: [{ kind: "no_action" }] },
 { id: "warrior-03", classId: "warrior", number: 3, text: { main: ["+1 def"], footer: [] }, effects: [{ kind: "defense", amount: 1, slot: "current" }] },
 { id: "warrior-04", classId: "warrior", number: 4, text: { main: ["+1 dano"], footer: [] }, effects: [{ kind: "damage", amount: 1, slot: "current" }] },
 { id: "warrior-05", classId: "warrior", number: 5, text: { main: ["+2 dano"], footer: ["Ripostar"] }, effects: [{ kind: "damage", amount: 2, slot: "current" }], damageCondition: "opponent_deals_damage" },
 { id: "warrior-06", classId: "warrior", number: 6, text: { main: ["+1 dano → +1 dano"], footer: [] }, effects: [{ kind: "damage", amount: 1, slot: "current" }, { kind: "damage", amount: 1, slot: "next" }] },
 { id: "warrior-07", classId: "warrior", number: 7, text: { main: ["Atordoamento"], footer: ["(Fadiga 1)"] }, effects: [{ kind: "stun", target: "opposing_card_same_slot" }], fatigue: { rounds: 1, reference: "round_placed_and_revealed" } },
 { id: "warrior-08", classId: "warrior", number: 8, text: { main: ["+3 dano"], footer: ["Ripostar", "(Fadiga 1)"] }, effects: [{ kind: "damage", amount: 3, slot: "current" }], damageCondition: "opponent_deals_damage", fatigue: { rounds: 1, reference: "round_placed_and_revealed" } },
 { id: "warrior-09", classId: "warrior", number: 9, text: { main: ["+1 def → +1 def"], footer: ["(Fadiga 2)"] }, effects: [{ kind: "defense", amount: 1, slot: "current" }, { kind: "defense", amount: 1, slot: "next" }], fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
 { id: "warrior-10", classId: "warrior", number: 10, text: { main: ["+3 dano"], footer: ["(Fadiga 2)"] }, effects: [{ kind: "damage", amount: 3, slot: "current" }], fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
];

const definitions = new Map(warriorCards.map(card => [card.id, card]));
const decks: Record<Player, readonly DeckCard[]> = {
 // Keep existing instance IDs so rounds already saved on the server survive.
 1: warriorCards.map((card, index) => ({ instanceId: String(index + 1), definitionId: card.id })),
 2: warriorCards.map((card, index) => ({ instanceId: String.fromCharCode(65 + index), definitionId: card.id })),
};
export const deckFor = (player: Player) => decks[player];
export function definitionFor(player: Player, instanceId: string): CardDefinition | undefined {
 const instance = decks[player].find(card => card.instanceId === instanceId);
 return instance ? definitions.get(instance.definitionId) : undefined;
}
export const cardDescription = (card: CardDefinition) => "Guerreiro " + card.number + ": " + [...card.text.main, ...card.text.footer].join(" · ");
