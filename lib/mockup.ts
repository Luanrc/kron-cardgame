import { applyAction, availableCardsFor, missingRequiredCards, newGame, type GameState, type Player } from "./game.ts";
import { definitionFor, isMandatoryCard } from "./cards.ts";

// The visual sandbox runs the real rules entirely in memory. It never calls /api/room.
export function prepareOpponent(input: GameState): GameState {
 let game = input;
 const cards = availableCardsFor(game, 2);
 const required = missingRequiredCards(game, 2);
 const actions = cards.filter(card => !isMandatoryCard(definitionFor(2, card)!));
 const offset = (game.round - 1) % actions.length;
 const choices = [actions[offset], required[0], actions[(offset + 1) % actions.length], required[1], actions[(offset + 2) % actions.length]];
 for (const [slot, card] of choices.entries()) game = applyAction(game, 2, { type: "place", slot, card });
 return applyAction(game, 2, { type: "ready" });
}

export function createMockupGame() {
 return prepareOpponent(applyAction(newGame(), 2, { type: "select_deck", deck: "monk" }));
}

export function fillMockupField(input: GameState, player: Player = 1): GameState {
 let game = input;
 for (let slot = 0; slot < 5; slot++) game = applyAction(game, player, { type: "place", slot, card: null });
 for (let slot = 0; slot < 5; slot++) {
  if (game.slots[player][slot]) continue;
  const missing = missingRequiredCards(game, player);
  const available = availableCardsFor(game, player).filter(card => !game.slots[player].includes(card));
  const preferred = [10, 6, 7, 4, 3, 5, 8, 9].map(number => available.find(card => definitionFor(player, card)!.number === number)).find(Boolean);
  const card = missing[0] ?? preferred ?? available.find(card => !isMandatoryCard(definitionFor(player, card)!));
  if (card) game = applyAction(game, player, { type: "place", slot, card });
 }
 return game;
}
