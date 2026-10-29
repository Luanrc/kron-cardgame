import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, roomView, cardsFor } from "../lib/game.ts";
import { deckOptions, initialLifeFor, catalog, definitionFor } from "../lib/cards.ts";
import { createCreature } from "../lib/creatures.ts";
import { tableSides, tableSlot, canPlaceOnTable, deckTableColors } from "../lib/table-view.ts";

test("Live table supports every deck, both perspectives and the spectator", () => {
 assert.deepEqual(tableSides(1), [2,1]); assert.deepEqual(tableSides(2), [1,2]); assert.deepEqual(tableSides("spectator"), [2,1]);
 for (const {id} of deckOptions) {
  let game = applyAction(newGame(), 1, {type:"select_deck",deck:id});
  game = applyAction(game, 2, {type:"select_deck",deck:id});
  const room=roomView(game,1,1);
  assert.equal(room.initialLife[1],initialLifeFor(id)); assert.equal(room.life[2],initialLifeFor(id));
  assert.equal(typeof deckTableColors[id],"number");
  for(const card of cardsFor(1,id)) assert.equal(canPlaceOnTable(room,1,0,card),!definitionFor(1,card).fortify);
 }
});
test("Table faces never reveal own prepared cards or the opponent's hidden cards", () => {
 let game=applyAction(newGame(),1,{type:"place",slot:0,card:"4"});
 game=applyAction(game,2,{type:"place",slot:0,card:"D"});
 for(const viewer of [1,2,"spectator"]) {
  const room=roomView(game,viewer,1);
  for(const side of [1,2]) { assert.equal(tableSlot(room,side,0).card,"hidden");assert.equal(tableSlot(room,side,0).definition,undefined); }
 }
});
test("Creature slots accept only fortification and remain publicly visible before reveal", () => {
 const game=applyAction(newGame(),1,{type:"select_deck",deck:"summoner"});
 game.creatures[1][2]=createCreature(catalog.summoner[3],"summoner-1-4");
 const room=roomView(game,1,1);
 assert.equal(canPlaceOnTable(room,1,2,"summoner-1-6"),true);
 assert.equal(canPlaceOnTable(room,1,0,"summoner-1-6"),false);
 assert.equal(canPlaceOnTable(room,1,2,"summoner-1-1"),false);
 assert.equal(canPlaceOnTable(room,1,0,"summoner-1-4"),false);
 assert.equal(tableSlot(roomView(game,"spectator",1),1,2).creature.life,2);
});
test("Placement respects Premonition, fatigue and readiness", () => {
 const game=newGame(); game.visions[2]={round:1,slot:null};
 assert.equal(canPlaceOnTable(roomView(game,1,1),1,0,"4"),false);
 game.visions[2].slot=2;
 assert.equal(canPlaceOnTable(roomView(game,1,1),1,2,"4"),false);
 assert.equal(canPlaceOnTable(roomView(game,1,1),1,1,"4"),true);
 game.ready[1]=true;
 assert.equal(canPlaceOnTable(roomView(game,1,1),1,1,"4"),false);
 game.ready[1]=false; game.fatigue[1]["7"]={usedRound:0,availableRound:2};
 assert.equal(canPlaceOnTable(roomView(game,1,1),1,1,"7"),false);
});
