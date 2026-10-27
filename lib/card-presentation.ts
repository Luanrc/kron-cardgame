import type { CardDefinition } from "./cards";

// Presentation only: the battle continues to use the structured card effects.
const compact: Record<string, CardDefinition["text"]> = {
 "monk-06": { main: ["+1 def e +2 dano"], footer: ["Ripostar"] },
 "monk-07": { main: ["Defletir"], footer: ["(Fadiga 2)"] },
 "monk-09": { main: ["Refletir ← Refletir"], footer: ["(Fadiga 2)"] },
 "monk-10": { main: ["+2 dano → +4 def"], footer: ["Ripostar", "(Fadiga 2)"] },
 "rogue-07": { main: ["+1 dano → +1 dano"], footer: ["Sangramento", "(Fadiga 1)"] },
 "rogue-09": { main: ["+2 dano"], footer: ["Flutuando 1"] },
 "rogue-10": { main: ["+1 dano"], footer: ["Sangramento · ×2", "Flutuando 3", "(Fadiga 2)"] },
 "paladin-07": { main: ["+X dano"], footer: ["X = gasto ÷ 2", "(Fadiga 1)"] },
 "paladin-10": { main: ["+X def"], footer: ["Flutuando 1 →", "X = gasto ÷ 2", "(Fadiga 2)"] },
};
export const compactCardText = (card: CardDefinition) => compact[card.id] ?? card.text;
