import type { CardDefinition, CardEffect, DeckId } from "./cards.ts";

const effect = (kind: "damage" | "defense", amount: number, delay = 0, guaranteed = false): CardEffect => ({ kind, amount, slot: delay ? "next" : "current", ...(delay > 1 ? { delay } : {}), ...(guaranteed ? { guaranteed: true } : {}) });
const damage = (amount: number, delay = 0, guaranteed = false) => effect("damage", amount, delay, guaranteed);
const defense = (amount: number, delay = 0) => effect("defense", amount, delay);
const stun: CardEffect = { kind: "stun", target: "opposing_card_same_slot" };
function card(classId: DeckId, number: number, main: string, effects: CardEffect[] = [], footer: string[] = [], fatigue = 0, extra: Partial<CardDefinition> = {}): CardDefinition {
 return { id: `${classId}-${String(number).padStart(2, "0")}`, classId, number, text: { main: [main], footer: [...footer, ...(fatigue ? [`(Fadiga ${fatigue})`] : [])] }, effects, ...(fatigue ? { fatigue: { rounds: fatigue, reference: "round_placed_and_revealed" as const } } : {}), ...extra };
}
const idle = (deck: DeckId, n: number) => card(deck, n, "Não age", [{ kind: "no_action" }]);
const riposte = { damageCondition: "opponent_deals_damage" as const };

export const gunnerCards: readonly CardDefinition[] = [
 idle("gunner", 1), idle("gunner", 2),
 card("gunner", 3, "Recarregar: +2 munição", [], [], 1, { resource: { kind: "ammo", gain: 2 } }),
 card("gunner", 4, "Recarregar: completar munição", [], [], 2, { resource: { kind: "ammo", fill: true } }),
 card("gunner", 5, "+1 def", [defense(1)]),
 card("gunner", 6, "Atirar: +1 dano", [damage(1, 0, true)], ["Garantido", "Custo: 1 munição"], 0, { resource: { kind: "ammo", cost: 1 } }),
 card("gunner", 7, "Atirar: +1 dano → 0 → +1 dano", [damage(1), damage(1, 2)], ["Custo: 2 munição"], 0, { resource: { kind: "ammo", cost: 2 } }),
 card("gunner", 8, "Atirar: +2 dano → +2 dano", [damage(2), damage(2, 1)], ["Custo: 4 munição"], 1, { resource: { kind: "ammo", cost: 4 } }),
 card("gunner", 9, "Atirar: +4 dano", [damage(4)], ["Custo: 4 munição", "Se causar dano, adiciona 2 marcadores de Sangramento no slot adversário."], 2, { resource: { kind: "ammo", cost: 4 }, bleeding: { amount: 2 }, brief: { main: ["Atirar: +4 dano"], footer: ["Custo: 4 munição", "Sangramento 2", "(Fadiga 2)"] } }),
 card("gunner", 10, "Atirar: +2 dano", [damage(2)], ["Custo: 1 munição"], 0, { resource: { kind: "ammo", cost: 1 } }),
];

export const rangerCards: readonly CardDefinition[] = [
 idle("ranger", 1), idle("ranger", 2), card("ranger", 3, "+1 dano", [damage(1)]),
 card("ranger", 4, "0 → +1 dano", [damage(1, 1)]),
 card("ranger", 5, "0 → 0 → +1 dano", [damage(1, 2)]),
 card("ranger", 6, "+2 dano", [damage(2)], ["Metade do dano deste ataque é garantida, arredondada para baixo."], 1, { halfGuaranteed: true, brief: { main: ["+2 dano"], footer: ["Metade garantida ↓", "(Fadiga 1)"] } }),
 card("ranger", 7, "+2 def e +1 dano", [defense(2), damage(1)], ["Ripostar"], 2, riposte),
 card("ranger", 8, "Atordoamento e +2 dano", [stun, damage(2)], ["Ripostar"], 2, riposte),
 card("ranger", 9, "+1 dano → +1 dano → +1 dano", [damage(1), damage(1, 1), damage(1, 2)], [], 2),
 card("ranger", 10, "+1 dano", [damage(1)], ["Flutuando 3"], 1, { floating: { effect: "damage", range: 3, points: 1 } }),
];

export const guardianCards: readonly CardDefinition[] = [
 idle("guardian", 1), idle("guardian", 2),
 card("guardian", 3, "+1 def", [defense(1)], ["Também bloqueia dano garantido."], 0, { blocksGuaranteed: true, brief: { main: ["+1 def"], footer: ["Defende garantido"] } }),
 card("guardian", 4, "+1 def", [defense(1)], ["Também bloqueia dano garantido."], 0, { blocksGuaranteed: true, brief: { main: ["+1 def"], footer: ["Defende garantido"] } }),
 card("guardian", 5, "+1 dano", [damage(1)]),
 card("guardian", 6, "+1 dano e +1 def", [damage(1), defense(1)]),
 card("guardian", 7, "+1 dano", [damage(1)], [], 1),
 card("guardian", 8, "+1 def → +1 def", [defense(1), defense(1, 1)], [], 1),
 card("guardian", 9, "+1 def → +1 def → +1 def → +1 def → +1 def", [defense(1), defense(1, 1), defense(1, 2), defense(1, 3), defense(1, 4)], [], 2, { brief: { main: ["+1 def por 5 slots"], footer: ["Atual e 4 seguintes", "(Fadiga 2)"] } }),
 card("guardian", 10, "Vingar", [], ["Devolve metade do dano defendido até este slot, arredondada para baixo."], 2, { revenge: true, brief: { main: ["Vingar"], footer: ["Metade do dano defendido", "(Fadiga 2)"] } }),
];

export const mageCards: readonly CardDefinition[] = [
 idle("mage", 1), idle("mage", 2), card("mage", 3, "+1 def", [defense(1)]),
 card("mage", 4, "Conjuração ofensiva: +1 dano", [damage(1)], ["Se não sofrer dano neste slot, ganha 1 Recurso Arcano. Refletir não altera a geração de recurso."], 0, { resource: { kind: "arcane", gain: 1, gainCondition: "no_damage_taken" }, brief: { main: ["+1 dano"], footer: ["Conjuração ofensiva", "+1 arcano se ileso"] } }),
 card("mage", 5, "Conjuração garantida", [], ["Ganha 1 Recurso Arcano."], 0, { resource: { kind: "arcane", gain: 1 }, brief: { main: ["+1 Recurso Arcano"], footer: ["Conjuração garantida"] } }),
 card("mage", 6, "Conjuração reforçada: +1 def", [defense(1)], ["Se não sofrer dano neste slot, ganha 1 Recurso Arcano. Refletir não altera a geração de recurso."], 0, { resource: { kind: "arcane", gain: 1, gainCondition: "no_damage_taken" }, brief: { main: ["+1 def"], footer: ["Conjuração reforçada", "+1 arcano se ileso"] } }),
 card("mage", 7, "Conjurar: +2 dano", [damage(2, 0, true)], ["Garantido", "Custo: 1 Recurso Arcano"], 0, { resource: { kind: "arcane", cost: 1 } }),
 card("mage", 8, "Conjurar: +3 dano", [damage(3)], ["Custo: 1 Recurso Arcano"], 0, { resource: { kind: "arcane", cost: 1 } }),
 card("mage", 9, "Conjurar: Atordoamento", [stun], ["Custo: 2 Recursos Arcanos"], 2, { resource: { kind: "arcane", cost: 2 } }),
 card("mage", 10, "Conjurar: Premonição", [], ["Custo: 2 Recursos Arcanos", "Na próxima rodada, o adversário revela e trava antecipadamente um slot para uma carta Não age."], 2, { resource: { kind: "arcane", cost: 2 }, premonition: true, brief: { main: ["Premonição"], footer: ["Custo: 2 arcano", "Revela Não age na próxima rodada", "(Fadiga 2)"] } }),
 card("mage", 11, "+1 def → +1 def", [defense(1), defense(1, 1)], ["Custo: 1 Recurso Arcano"], 1, { resource: { kind: "arcane", cost: 1 } }),
 card("mage", 12, "+3 Recurso Arcano", [], [], 2, { resource: { kind: "arcane", gain: 3 } }),
];

export const barbarianCards: readonly CardDefinition[] = [
 idle("barbarian", 1), idle("barbarian", 2), card("barbarian", 3, "+1 dano", [damage(1)]),
 card("barbarian", 4, "+1 dano", [damage(1)], ["Se sofrer dano neste slot, causa 2 de dano no lugar."], 0, { damageRule: { kind: "if_hit", amount: 2 }, brief: { main: ["+1 dano / +2 se atingido"], footer: [] } }),
 card("barbarian", 5, "+2 dano", [damage(2)], ["Se o adversário tiver defesa neste slot, este ataque causa 0 de dano."], 0, { damageRule: { kind: "zero_if_defense" }, brief: { main: ["+2 dano"], footer: ["0 contra defesa"] } }),
 card("barbarian", 6, "+X dano", [], ["X = 1 para cada 3 pontos de vida perdidos, arredondado para baixo."], 1, { damageRule: { kind: "lost_life", divisor: 3 }, brief: { main: ["+X dano"], footer: ["X = vida perdida ÷ 3 ↓", "(Fadiga 1)"] } }),
 card("barbarian", 7, "+0 dano", [damage(0)], ["Se sofrer dano neste slot, causa 3 de dano no lugar."], 1, { damageRule: { kind: "if_hit", amount: 3 }, brief: { main: ["+3 dano se atingido"], footer: ["(Fadiga 1)"] } }),
 card("barbarian", 8, "+1 dano → +2 dano", [damage(1), damage(2, 1)], ["Se sofrer dano no slot atual, o dano atual passa a 3."], 1, { damageRule: { kind: "if_hit", amount: 3 }, brief: { main: ["+1 dano → +2 dano"], footer: ["Atual: +3 se atingido", "(Fadiga 1)"] } }),
 card("barbarian", 9, "+X dano", [], ["X = vida total − vida atual."], 2, { damageRule: { kind: "lost_life", divisor: 1 }, brief: { main: ["+X dano"], footer: ["X = vida perdida", "(Fadiga 2)"] } }),
 card("barbarian", 10, "Fúria", [], ["Na próxima rodada, suas cartas Não age deixam de ser obrigatórias."], 3, { rage: true, brief: { main: ["Fúria"], footer: ["Próxima rodada sem Não age obrigatória", "(Fadiga 3)"] } }),
];

export const summonerCards: readonly CardDefinition[] = [
 idle("summoner", 1), idle("summoner", 2), card("summoner", 3, "+1 dano", [damage(1)]),
 card("summoner", 4, "Invocar criatura: Lobo", [], ["Vida total: 2", "+1 dano"], 1, { summon: { creature: "wolf", life: 2, damage: 1, defense: 0 } }),
 card("summoner", 5, "Invocar criatura: Urso", [], ["Vida total: 3", "+1 def", "+1 dano"], 2, { summon: { creature: "bear", life: 3, damage: 1, defense: 1 } }),
 card("summoner", 6, "Fortalecer criatura: +1 dano", [], ["Bônus apenas nesta rodada."], 1, { fortify: { stat: "damage", amount: 1, duration: "round" } }),
 card("summoner", 7, "Fortalecer criatura: +1 def", [], ["Bônus apenas nesta rodada."], 1, { fortify: { stat: "defense", amount: 1, duration: "round" } }),
 card("summoner", 8, "Fortalecer criatura: +1 dano", [], ["Bônus permanente."], 2, { fortify: { stat: "damage", amount: 1, duration: "permanent" } }),
 card("summoner", 9, "Fortalecer criatura: +1 def", [], ["Bônus permanente."], 2, { fortify: { stat: "defense", amount: 1, duration: "permanent" } }),
 card("summoner", 10, "Fortalecer criatura: +1 vida", [], ["Bônus permanente."], 2, { fortify: { stat: "life", amount: 1, duration: "permanent" } }),
 card("summoner", 11, "+1 def", [defense(1)]),
];

export const summonerRules = [
 "A criatura permanece no slot em que foi invocada até sua vida chegar a 0.",
 "O adversário escolhe se ataca a criatura ou o jogador.",
 "Slots ocupados por criaturas só aceitam cartas de Fortalecer criatura.",
] as const;
