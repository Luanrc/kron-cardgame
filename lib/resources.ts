import { definitionFor, type DeckId } from "./cards.ts";
import type { Player, Slots } from "./game.ts";

export type ResourceBalances = { ammo: Record<Player, number>; arcane: Record<Player, number> };
export const initialResources = (decks: Record<Player, DeckId>): ResourceBalances => ({
 ammo: { 1: decks[1] === "gunner" ? 6 : 0, 2: decks[2] === "gunner" ? 6 : 0 },
 arcane: { 1: decks[1] === "mage" ? 2 : 0, 2: decks[2] === "mage" ? 2 : 0 },
});
export function plannedAmmo(player: Player, slots: Slots) {
 return slots.reduce((sum, id) => sum + (id && definitionFor(player, id)?.resource?.kind === "ammo" ? definitionFor(player, id)!.resource!.cost ?? 0 : 0), 0);
}
export function validateResourcePlan(player: Player, slots: Slots, balances: ResourceBalances) {
 if (plannedAmmo(player, slots) > 4) throw new Error("O Atirador pode gastar no máximo 4 munições por rodada, mesmo recarregando.");
 const available = { ammo: balances.ammo[player], arcane: balances.arcane[player] };
 for (const [slot, id] of slots.entries()) {
  const rule = id ? definitionFor(player, id)?.resource : undefined;
  if (!rule) continue;
  if ((rule.cost ?? 0) > available[rule.kind]) throw new Error(`Recurso insuficiente antes do slot ${slot + 1}. Reordene as cartas ou inclua uma recarga/conjuração anterior.`);
  available[rule.kind] -= rule.cost ?? 0;
  if (rule.fill) available.ammo = 6;
  else available[rule.kind] = Math.min(rule.kind === "ammo" ? 6 : Number.MAX_SAFE_INTEGER, available[rule.kind] + (rule.gain ?? 0));
 }
}
