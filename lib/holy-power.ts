import { definitionFor } from "./cards.ts";
import type { Player, Slots } from "./game";

export type HolyPower = Record<Player, number>;
export type HolySpending = Record<Player, Record<string, number>>;
export const emptyHolyPower = (): HolyPower => ({ 1: 0, 2: 0 });
export const emptyHolySpending = (): HolySpending => ({ 1: {}, 2: {} });
export const holyEffectValue = (spent: number) => Math.floor(spent / 2);
// This bound uses only the player's own cards, never hidden opposing choices.
export function potentialHolyPower(player: Player, slots: Slots, cardId: string, starting: number) {
 const source = slots.indexOf(cardId);
 return starting + slots.slice(0, source).reduce((total, card) => total + (card ? definitionFor(player, card)?.holyPower?.gain ?? 0 : 0), 0);
}
export function validateHolySpending(amount: unknown, maximum: number): asserts amount is number {
 if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0 || amount > maximum) throw new Error("Gasto de Poder Sagrado inválido. Escolha um número inteiro dentro do saldo possível.");
}
