import type { CardDefinition } from "./cards";
import type { Player } from "./game";

export type SlotCounters = Record<Player, number[]>;
export type FloatingState = Record<Player, Record<string, number[]>>;
export const emptySlotCounters = (): SlotCounters => ({ 1: Array(5).fill(0), 2: Array(5).fill(0) });
export const emptyFloating = (): FloatingState => ({ 1: {}, 2: {} });
export function targetSlots(origin: number, range: number) {
 return Array.from({ length: 5 }, (_, slot) => slot).filter(slot => Math.abs(slot - origin) <= range);
}
export function validateTargets(card: CardDefinition, origin: number, targets: unknown): asserts targets is number[] {
 if (!card.floating || !Array.isArray(targets) || targets.length !== card.floating.points || targets.some(slot => !Number.isInteger(slot) || slot < 0 || slot > 4 || Math.abs(slot - origin) > card.floating!.range)) throw new Error("Distribuição de Flutuando inválida. Respeite os pontos e o alcance da carta.");
}
