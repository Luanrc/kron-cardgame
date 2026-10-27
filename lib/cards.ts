import type { Player } from "./game";
export type DeckId = "warrior" | "monk";
export const deckOptions: readonly { id: DeckId; name: string; description: string }[] = [
 { id: "warrior", name: "Guerreiro", description: "Dano, defesa, Atordoamento e Ripostar." },
 { id: "monk", name: "Monge", description: "Defesa, Ripostar, Defletir e Refletir." },
];
export const classNameFor = (id: DeckId) => deckOptions.find(deck => deck.id === id)!.name;
export const isDeckId = (value: unknown): value is DeckId => deckOptions.some(deck => deck.id === value);

// Definitions are shared by both decks. Instances belong to a particular player.
// Combat must consume these fields, never parse the displayed Portuguese text.
export type CardEffect =
 | { kind: "no_action" }
 | { kind: "damage" | "defense"; amount: number; slot: "current" | "next" }
 | { kind: "stun"; target: "opposing_card_same_slot" }
 | { kind: "deflect" }
 | { kind: "reflect"; slots: "previous_and_current" };
export type CardDefinition = {
 id: string;
 classId: DeckId;
 number: number;
 text: { main: readonly string[]; footer: readonly string[] };
 effects: readonly CardEffect[];
 damageCondition?: "opponent_deals_damage";
 nextSlotCondition?: "riposte_triggered";
 fatigue?: { rounds: number; reference: "round_placed_and_revealed" };
};
export type DeckCard = { instanceId: string; definitionId: string };

export const warriorRulePolicy = {
 nextSlotOverflow: "discard",
 riposte: { requires: "actual_opponent_damage", againstRiposte: "no_effect" },
 fatigue: { unit: "round", starts: "round_after_use" },
} as const;

export const isMandatoryCard = (card: CardDefinition) => card.effects.some(effect => effect.kind === "no_action");
export const nextAvailableRound = (card: CardDefinition, usedRound: number) => usedRound + (isMandatoryCard(card) ? 0 : card.fatigue?.rounds ?? 0) + 1;

export function validateDeck(cards: readonly CardDefinition[]) {
 const required = cards.filter(isMandatoryCard);
 if (required.length === 0) throw new Error("Todo baralho precisa de cartas Não age.");
 if (required.length > 5) throw new Error("As cartas obrigatórias precisam caber nos cinco slots.");
 if (required.some(card => (card.fatigue?.rounds ?? 0) > 0)) throw new Error("Cartas Não age não podem ter Fadiga.");
}

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

export const monkCards: readonly CardDefinition[] = [
 { id: "monk-01", classId: "monk", number: 1, text: { main: ["Não age"], footer: [] }, effects: [{ kind: "no_action" }] },
 { id: "monk-02", classId: "monk", number: 2, text: { main: ["Não age"], footer: [] }, effects: [{ kind: "no_action" }] },
 { id: "monk-03", classId: "monk", number: 3, text: { main: ["+1 dano"], footer: [] }, effects: [{ kind: "damage", amount: 1, slot: "current" }] },
 { id: "monk-04", classId: "monk", number: 4, text: { main: ["+1 def"], footer: [] }, effects: [{ kind: "defense", amount: 1, slot: "current" }] },
 { id: "monk-05", classId: "monk", number: 5, text: { main: ["+1 def e +2 dano"], footer: ["Ripostar"] }, effects: [{ kind: "defense", amount: 1, slot: "current" }, { kind: "damage", amount: 2, slot: "current" }], damageCondition: "opponent_deals_damage" },
 { id: "monk-06", classId: "monk", number: 6, text: { main: ["+1 def e +2 dano", "Ripostar"], footer: [] }, effects: [{ kind: "defense", amount: 1, slot: "current" }, { kind: "damage", amount: 2, slot: "current" }], damageCondition: "opponent_deals_damage" },
 { id: "monk-07", classId: "monk", number: 7, text: { main: ["Defletir"], footer: ["Anula todo o dano recebido neste slot.", "(Fadiga 2)"] }, effects: [{ kind: "deflect" }], fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
 { id: "monk-08", classId: "monk", number: 8, text: { main: ["Atordoamento"], footer: ["(Fadiga 1)"] }, effects: [{ kind: "stun", target: "opposing_card_same_slot" }], fatigue: { rounds: 1, reference: "round_placed_and_revealed" } },
 { id: "monk-09", classId: "monk", number: 9, text: { main: ["Refletir ← Refletir"], footer: ["Anula e devolve o dano dos slots anterior e atual.", "(Fadiga 2)"] }, effects: [{ kind: "reflect", slots: "previous_and_current" }], fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
 { id: "monk-10", classId: "monk", number: 10, text: { main: ["Ripostar: +2 dano", "Se ativar: +4 def no próximo slot"], footer: ["(Fadiga 2)"] }, effects: [{ kind: "damage", amount: 2, slot: "current" }, { kind: "defense", amount: 4, slot: "next" }], damageCondition: "opponent_deals_damage", nextSlotCondition: "riposte_triggered", fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
];

const catalog = { warrior: warriorCards, monk: monkCards };
const definitions = new Map([...warriorCards, ...monkCards].map(card => [card.id, card]));
for (const cards of Object.values(catalog)) validateDeck(cards);
const warriorDecks: Record<Player, readonly DeckCard[]> = {
 // Keep existing instance IDs so rounds already saved on the server survive.
 1: warriorCards.map((card, index) => ({ instanceId: String(index + 1), definitionId: card.id })),
 2: warriorCards.map((card, index) => ({ instanceId: String.fromCharCode(65 + index), definitionId: card.id })),
};
export const deckFor = (player: Player, deck: DeckId = "warrior"): readonly DeckCard[] => deck === "warrior" ? warriorDecks[player] : monkCards.map(card => ({ instanceId: `monk-${player}-${card.number}`, definitionId: card.id }));
export function definitionFor(player: Player, instanceId: string): CardDefinition | undefined {
 const instance = deckOptions.flatMap(deck => deckFor(player, deck.id)).find(card => card.instanceId === instanceId);
 return instance ? definitions.get(instance.definitionId) : undefined;
}
export const cardDescription = (card: CardDefinition) => classNameFor(card.classId) + " " + card.number + ": " + [...card.text.main, ...card.text.footer].join(" · ");
