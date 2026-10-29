import { advanceRound } from "./round-helpers.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, roomView, resetMatch, normalizeGameState } from "../lib/game.ts";

test("Deck selection sets each player's life independently and can be changed before play", () => {
 let state = applyAction(newGame(), 1, { type: "select_deck", deck: "rogue" });
 state = applyAction(state, 2, { type: "select_deck", deck: "paladin" });
 assert.deepEqual(state.life, { 1: 9, 2: 12 });
 assert.deepEqual(roomView(state, "spectator", 1).initialLife, { 1: 9, 2: 12 });
 state = applyAction(state, 1, { type: "select_deck", deck: "monk" });
 assert.deepEqual(state.life, { 1: 10, 2: 12 });
 state = applyAction(state, 1, { type: "select_deck", deck: "warrior" });
 assert.deepEqual(state.life, { 1: 10, 2: 12 });
});

test("Rounds preserve damage, restart restores class life, and full reset restores default decks", () => {
 let state = applyAction(newGame(), 1, { type: "select_deck", deck: "rogue" });
 state = applyAction(state, 2, { type: "select_deck", deck: "paladin" });
 state.life = { 1: 7, 2: 11 }; state.ready = { 1: true, 2: true };
 assert.throws(() => applyAction(state, 1, { type: "select_deck", deck: "monk" }));
 state = advanceRound(state);
 assert.deepEqual(state.life, { 1: 7, 2: 11 });
 assert.deepEqual(normalizeGameState(state).life, state.life);
 state.life = { 1: 0, 2: 3 }; state.result = { type: "win", winner: 2 };
 const restarted = applyAction(state, 1, { type: "restart" });
 assert.deepEqual(restarted.life, { 1: 9, 2: 12 });
 assert.deepEqual(restarted.decks, { 1: "rogue", 2: "paladin" });
 const { life, ...withoutLife } = restarted;
 assert.deepEqual(normalizeGameState(withoutLife).life, { 1: 9, 2: 12 });
 assert.deepEqual(resetMatch(restarted).life, { 1: 10, 2: 10 });
});
