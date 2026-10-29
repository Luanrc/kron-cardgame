import { gunnerCards, rangerCards, guardianCards, mageCards, barbarianCards, summonerCards } from "./expansion-cards.ts";
import type { Player } from "./game";
export type DeckId = "warrior" | "monk" | "rogue" | "paladin" | "gunner" | "ranger" | "guardian" | "mage" | "barbarian" | "summoner";
export const deckOptions: readonly { id: DeckId; name: string; description: string }[] = [
 { id: "warrior", name: "Guerreiro", description: "Combina ataques e defesa. Ripostar reage ao dano sofrido, e Atordoamento impede a carta adversária de agir." },
 { id: "monk", name: "Monge", description: "Defletir anula o dano do slot. Refletir protege os slots anterior e atual, devolvendo o dano ao adversário." },
 { id: "rogue", name: "Ladino", description: "Sangramento deixa dano para a próxima rodada. Flutuando permite escolher os slots atingidos dentro do alcance da carta." },
 { id: "paladin", name: "Paladino", description: "Acumula Poder Sagrado com ataques e defesas bem-sucedidos. Escolha quanto gastar para fortalecer uma carta com X por rodada." },
 { id: "gunner", name: "Atirador", description: "Administra munição para disparos precisos. Recarrega entre ataques e pode gastar até 4 de munição por rodada." },
 { id: "ranger", name: "Patrulheiro", description: "Prepara ataques para slots futuros e combina dano garantido, Ripostar e Flutuando." },
 { id: "guardian", name: "Guardião", description: "Sustenta a defesa por vários slots, bloqueia dano garantido com cartas próprias e usa Vingar." },
 { id: "mage", name: "Mago", description: "Possui 12 cartas e pouca vida. Gera Recurso Arcano para financiar conjurações e efeitos de controle." },
 { id: "barbarian", name: "Bárbaro", description: "Seus ataques crescem ao sofrer dano. Fúria dispensa as cartas Não age na rodada seguinte." },
 { id: "summoner", name: "Invocador", description: "Mantém um Lobo e um Urso nos slots entre rodadas. Fortalecimentos melhoram suas criaturas, e o adversário escolhe quem atacar." },
];
export const isDeckPlayable = (id: DeckId) => isDeckId(id);
export const initialLifeFor = (id: DeckId): number => ({ warrior: 10, monk: 10, rogue: 9, paladin: 12, gunner: 10, ranger: 10, guardian: 12, mage: 8, barbarian: 11, summoner: 11 })[id];
export const classNameFor = (id: DeckId) => deckOptions.find(deck => deck.id === id)!.name;
export const isDeckId = (value: unknown): value is DeckId => deckOptions.some(deck => deck.id === value);

// Definitions are shared by both decks. Instances belong to a particular player.
// Combat must consume these fields, never parse the displayed Portuguese text.
export type CardEffect =
 | { kind: "no_action" }
 | { kind: "damage" | "defense"; amount: number; slot: "current" | "next"; delay?: number; guaranteed?: boolean }
 | { kind: "stun"; target: "opposing_card_same_slot" }
 | { kind: "deflect" }
 | { kind: "reflect"; slots: "previous_and_current" };
export type CardDefinition = {
 id: string;
 classId: DeckId;
 number: number;
 brief?: { main: readonly string[]; footer: readonly string[] };
 resource?: { kind: "ammo" | "arcane"; cost?: number; gain?: number; fill?: boolean; gainCondition?: "no_damage_taken" };
 blocksGuaranteed?: boolean;
 halfGuaranteed?: boolean;
 revenge?: boolean;
 rage?: boolean;
 premonition?: boolean;
 damageRule?: { kind: "if_hit"; amount: number } | { kind: "zero_if_defense" } | { kind: "lost_life"; divisor: number };
 summon?: { creature: "wolf" | "bear"; life: number; damage: number; defense: number; riposte?: boolean };
 fortify?: { stat: "damage" | "defense" | "life"; amount: number; duration: "round" | "permanent" };
 text: { main: readonly string[]; footer: readonly string[] };
 effects: readonly CardEffect[];
 damageCondition?: "opponent_deals_damage";
 nextSlotCondition?: "riposte_triggered";
 bleeding?: { amount: number; doubleAfterAdding?: boolean };
 floating?: { effect: "damage" | "defense" | "bleeding"; range: number; points: number; direction?: "forward" };
 holyPower?: { gain?: number; scaling?: "damage" | "defense" };
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

export const rogueCards: readonly CardDefinition[] = [
 { id: "rogue-01", classId: "rogue", number: 1, text: { main: ["Não age"], footer: [] }, effects: [{ kind: "no_action" }] },
 { id: "rogue-02", classId: "rogue", number: 2, text: { main: ["Não age"], footer: [] }, effects: [{ kind: "no_action" }] },
 { id: "rogue-03", classId: "rogue", number: 3, text: { main: ["+1 dano"], footer: ["Sangramento"] }, effects: [{ kind: "damage", amount: 1, slot: "current" }], bleeding: { amount: 1 } },
 { id: "rogue-04", classId: "rogue", number: 4, text: { main: ["+1 dano"], footer: ["Sangramento"] }, effects: [{ kind: "damage", amount: 1, slot: "current" }], bleeding: { amount: 1 } },
 { id: "rogue-05", classId: "rogue", number: 5, text: { main: ["+1 def"], footer: [] }, effects: [{ kind: "defense", amount: 1, slot: "current" }] },
 { id: "rogue-06", classId: "rogue", number: 6, text: { main: ["Atordoamento"], footer: ["(Fadiga 1)"] }, effects: [{ kind: "stun", target: "opposing_card_same_slot" }], fatigue: { rounds: 1, reference: "round_placed_and_revealed" } },
 { id: "rogue-07", classId: "rogue", number: 7, text: { main: ["+1 dano → +1 dano"], footer: ["Sangramento só no slot atual", "(Fadiga 1)"] }, effects: [{ kind: "damage", amount: 1, slot: "current" }, { kind: "damage", amount: 1, slot: "next" }], bleeding: { amount: 1 }, fatigue: { rounds: 1, reference: "round_placed_and_revealed" } },
 { id: "rogue-08", classId: "rogue", number: 8, text: { main: ["+1 def → +1 def"], footer: ["(Fadiga 2)"] }, effects: [{ kind: "defense", amount: 1, slot: "current" }, { kind: "defense", amount: 1, slot: "next" }], fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
 { id: "rogue-09", classId: "rogue", number: 9, text: { main: ["+2 dano"], footer: ["Flutuando 1", "Divida o dano entre slots ao alcance."] }, effects: [{ kind: "damage", amount: 2, slot: "current" }], floating: { effect: "damage", range: 1, points: 2 } },
 { id: "rogue-10", classId: "rogue", number: 10, text: { main: ["+1 dano"], footer: ["Sangramento · Flutuando 3", "Adiciona 1 marcador e dobra os do destino.", "(Fadiga 2)"] }, effects: [{ kind: "damage", amount: 1, slot: "current" }], bleeding: { amount: 1, doubleAfterAdding: true }, floating: { effect: "bleeding", range: 3, points: 1 }, fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
];

export const paladinCards: readonly CardDefinition[] = [
 { id: "paladin-01", classId: "paladin", number: 1, text: { main: ["Não age"], footer: [] }, effects: [{ kind: "no_action" }] },
 { id: "paladin-02", classId: "paladin", number: 2, text: { main: ["Não age"], footer: [] }, effects: [{ kind: "no_action" }] },
 { id: "paladin-03", classId: "paladin", number: 3, text: { main: ["+1 dano"], footer: ["+1 Poder Sagrado"] }, effects: [{ kind: "damage", amount: 1, slot: "current" }], holyPower: { gain: 1 } },
 { id: "paladin-04", classId: "paladin", number: 4, text: { main: ["+1 dano"], footer: ["+1 Poder Sagrado"] }, effects: [{ kind: "damage", amount: 1, slot: "current" }], holyPower: { gain: 1 } },
 { id: "paladin-05", classId: "paladin", number: 5, text: { main: ["+1 def"], footer: ["+1 Poder Sagrado"] }, effects: [{ kind: "defense", amount: 1, slot: "current" }], holyPower: { gain: 1 } },
 { id: "paladin-06", classId: "paladin", number: 6, text: { main: ["+1 def"], footer: ["+1 Poder Sagrado"] }, effects: [{ kind: "defense", amount: 1, slot: "current" }], holyPower: { gain: 1 } },
 { id: "paladin-07", classId: "paladin", number: 7, text: { main: ["+X dano"], footer: ["Escolha quanto Poder Sagrado gastar.", "X = metade do gasto, arredondada para baixo.", "(Fadiga 1)"] }, effects: [], holyPower: { scaling: "damage" }, fatigue: { rounds: 1, reference: "round_placed_and_revealed" } },
 { id: "paladin-08", classId: "paladin", number: 8, text: { main: ["+4 Poder Sagrado"], footer: ["(Fadiga 2)"] }, effects: [], holyPower: { gain: 4 }, fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
 { id: "paladin-09", classId: "paladin", number: 9, text: { main: ["+3 def → +3 def"], footer: ["(Fadiga 2)"] }, effects: [{ kind: "defense", amount: 3, slot: "current" }, { kind: "defense", amount: 3, slot: "next" }], fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
 { id: "paladin-10", classId: "paladin", number: 10, text: { main: ["+X def"], footer: ["Flutuando 1: atual ou seguinte.", "X = metade do gasto de Poder Sagrado, arredondada para baixo.", "(Fadiga 2)"] }, effects: [], holyPower: { scaling: "defense" }, floating: { effect: "defense", range: 1, points: 1, direction: "forward" }, fatigue: { rounds: 2, reference: "round_placed_and_revealed" } },
];

export const catalog = { warrior: warriorCards, monk: monkCards, rogue: rogueCards, paladin: paladinCards, gunner: gunnerCards, ranger: rangerCards, guardian: guardianCards, mage: mageCards, barbarian: barbarianCards, summoner: summonerCards };
const definitions = new Map(Object.values(catalog).flat().map(card => [card.id, card]));
for (const cards of Object.values(catalog)) validateDeck(cards);
const warriorDecks: Record<Player, readonly DeckCard[]> = {
 // Keep existing instance IDs so rounds already saved on the server survive.
 1: warriorCards.map((card, index) => ({ instanceId: String(index + 1), definitionId: card.id })),
 2: warriorCards.map((card, index) => ({ instanceId: String.fromCharCode(65 + index), definitionId: card.id })),
};
export const deckFor = (player: Player, deck: DeckId = "warrior"): readonly DeckCard[] => deck === "warrior" ? warriorDecks[player] : catalog[deck].map(card => ({ instanceId: `${deck}-${player}-${card.number}`, definitionId: card.id }));
export function definitionFor(player: Player, instanceId: string): CardDefinition | undefined {
 const instance = deckOptions.flatMap(deck => deckFor(player, deck.id)).find(card => card.instanceId === instanceId);
 return instance ? definitions.get(instance.definitionId) : undefined;
}
export const cardDescription = (card: CardDefinition) => classNameFor(card.classId) + " " + card.number + ": " + [...card.text.main, ...card.text.footer].join(" · ");
