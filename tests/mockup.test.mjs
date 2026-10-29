import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockupGame, fillMockupField, prepareOpponent } from "../lib/mockup.ts";
import { applyAction, isRevealed, missingRequiredCards, roomView } from "../lib/game.ts";

test("The local mockup hides the opponent and resolves several rounds through the real engine", () => {
 let game = createMockupGame();
 assert.deepEqual(roomView(game, 1, 1).fields[1].slots, Array(5).fill("hidden"));
 assert.equal(game.ready[2], true);
 for (let round = 1; round <= 8 && !game.result; round++) {
  game = fillMockupField(game);
  assert.equal(game.slots[1].filter(Boolean).length, 5);
  assert.deepEqual(missingRequiredCards(game, 1), []);
  game = applyAction(game, 1, { type: "ready" });
  assert.equal(isRevealed(game), true);
  assert.ok(game.battle.length > 0);
  if (game.result) break;
  game = prepareOpponent(applyAction(game, 1, { type: "reset" }));
  assert.equal(game.round, round + 1);
 }
});

test("Fill example repairs an incomplete required-card plan without modifying its input", () => {
 let game = createMockupGame();
 for (const [slot, card] of ["3", "4", "5", "6", "7"].entries()) game = applyAction(game, 1, { type: "place", slot, card });
 const snapshot = structuredClone(game);
 const filled = fillMockupField(game);
 assert.deepEqual(game, snapshot);
 assert.equal(missingRequiredCards(filled, 1).length, 0);
});
