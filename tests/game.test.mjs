import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, roomView, cardsFor, requiredCardsFor, availableCardsFor, normalizeGameState } from "../lib/game.ts";
function fill(state, player) {
 return cardsFor(player).slice(0,5).reduce((s, card, slot) => applyAction(s, player, {type:"place",slot,card}), state);
}
test("spectator sees no hand or concealed card identities and cannot change the round", () => {
 let s = fill(fill(newGame(),1),2);
 let view = roomView(s,"spectator",0);
 assert.deepEqual(view.ownSlots,[]);
 assert.ok(view.fields.every(field => field.slots.every(card => card === "hidden")));
 s = applyAction(s,1,{type:"ready"});
 assert.equal(roomView(s,"spectator",1).revealed,false);
 assert.throws(() => applyAction(s,"spectator",{type:"ready"}));
 assert.throws(() => applyAction(s,"spectator",{type:"place",slot:0,card:"1"}));
 s = applyAction(s,2,{type:"ready"});
 assert.throws(() => applyAction(s,"spectator",{type:"reset"}));
 view = roomView(s,"spectator",2);
 assert.equal(view.revealed,true);
 assert.deepEqual(view.fields[0].slots,["1","2","3","4","5"]);
 assert.deepEqual(view.fields[1].slots,["A","B","C","D","E"]);
 assert.deepEqual(view.ownSlots,[]);
});
test("hands have exactly the requested identities; invalid and duplicate placements fail", () => {
 assert.deepEqual(cardsFor(1), ["1","2","3","4","5","6","7","8","9","10"]);
 assert.deepEqual(cardsFor(2), ["A","B","C","D","E","F","G","H","I","J"]);
 let s = newGame();
 assert.throws(() => applyAction(s,1,{type:"ready"}));
 assert.throws(() => applyAction(s,1,{type:"place",slot:0,card:"A"}));
 assert.throws(() => applyAction(s,2,{type:"place",slot:5,card:"A"}));
 s = applyAction(s,1,{type:"place",slot:0,card:"1"});
 assert.throws(() => applyAction(s,1,{type:"place",slot:1,card:"1"}));
 s = applyAction(s,1,{type:"place",slot:0,card:"2"});
 assert.equal(s.slots[1][0],"2");
 s = applyAction(s,1,{type:"place",slot:0,card:null});
 assert.deepEqual(s.slots[1],Array(5).fill(null));
});
test("cards stay concealed until BOTH ready, then reveal in their chosen slots", () => {
 let s = fill(fill(newGame(),1),2);
 const before = roomView(s,1,0);
 assert.deepEqual(before.fields[1].slots,Array(5).fill("hidden"));
 assert.deepEqual(before.fields[0].slots,Array(5).fill("hidden"));
 assert.deepEqual(before.ownSlots,["1","2","3","4","5"]);
 s = applyAction(s,1,{type:"ready"});
 assert.equal(roomView(s,2,1).revealed,false);
 assert.throws(() => applyAction(s,1,{type:"place",slot:0,card:"6"}));
 assert.throws(() => applyAction(s,2,{type:"reset"}));
 s = applyAction(s,2,{type:"place",slot:4,card:"J"});
 s = applyAction(s,2,{type:"ready"});
 assert.equal(roomView(s,1,2).revealed,true);
 assert.deepEqual(roomView(s,1,2).fields[1].slots,["A","B","C","D","J"]);
 const reset = applyAction(s,1,{type:"reset"});
 assert.equal(reset.round,2);
 assert.deepEqual(reset.slots,newGame(2).slots);
 assert.deepEqual(reset.ready,newGame(2).ready);
 assert.equal(reset.fatigue[2].J.availableRound,4);
});

test("both distinct No action cards are mandatory, in any chosen positions", () => {
 assert.deepEqual(requiredCardsFor(1),["1","2"]);
 assert.deepEqual(requiredCardsFor(2),["A","B"]);
 let s = ["3","4","5","6","7"].reduce((state,card,slot) => applyAction(state,1,{type:"place",slot,card}),newGame());
 assert.throws(() => applyAction(s,1,{type:"ready"}),/obrigatórias/);
 s = applyAction(s,1,{type:"place",slot:4,card:"1"});
 assert.throws(() => applyAction(s,1,{type:"ready"}),/obrigatórias/);
 s = applyAction(s,1,{type:"place",slot:2,card:"2"});
 s = applyAction(s,1,{type:"ready"});
 assert.equal(s.ready[1],true);
 assert.deepEqual(s.slots[1],["3","4","2","6","1"]);
});

test("fatigue is public only on reveal, blocks later rounds, and recovers per player", () => {
 let s = ["1","2","7","9","10"].reduce((state,card,slot) => applyAction(state,1,{type:"place",slot,card}),newGame());
 s = fill(s,2);
 s = applyAction(s,1,{type:"ready"});
 assert.deepEqual(roomView(s,"spectator",0).fatigue.map(side=>side.cards),[[],[]]);
 s = applyAction(s,2,{type:"ready"});
 const publicFatigue = roomView(s,"spectator",1).fatigue;
 assert.deepEqual(publicFatigue,roomView(s,1,1).fatigue);
 assert.deepEqual(publicFatigue,roomView(s,2,1).fatigue);
 assert.deepEqual(publicFatigue[0].cards,[
  {card:"7",remainingRounds:1,availableRound:3},
  {card:"9",remainingRounds:2,availableRound:4},
  {card:"10",remainingRounds:2,availableRound:4},
 ]);
 s = applyAction(s,1,{type:"reset"});
 assert.equal(s.round,2);
 assert.ok(!availableCardsFor(s,1).includes("7"));
 assert.ok(availableCardsFor(s,2).includes("G"));
 assert.throws(()=>applyAction(s,1,{type:"place",slot:0,card:"7"}),/Fadiga/);
 for (const card of requiredCardsFor(1)) assert.ok(availableCardsFor(s,1).includes(card));
 s = fill(s,1);
 s = ["A","B","C","D","G"].reduce((state,card,slot)=>applyAction(state,2,{type:"place",slot,card}),s);
 s = applyAction(s,1,{type:"ready"});
 s = applyAction(s,2,{type:"ready"});
 s = applyAction(s,1,{type:"reset"});
 assert.equal(s.round,3);
 assert.ok(availableCardsFor(s,1).includes("7"));
 assert.ok(!availableCardsFor(s,2).includes("G"));
 assert.deepEqual(roomView(s,"spectator",2).fatigue[0].cards.map(card=>card.remainingRounds),[1,1]);
 s = fill(fill(s,1),2);
 s = applyAction(s,1,{type:"ready"});
 s = applyAction(s,2,{type:"ready"});
 s = applyAction(s,2,{type:"reset"});
 assert.equal(s.round,4);
 assert.deepEqual(s.fatigue,{1:{},2:{}});
 assert.equal(availableCardsFor(s,1).length,10);
 assert.equal(availableCardsFor(s,2).length,10);
});

test("saved legacy rounds gain fatigue without losing the field; old invalid ready can be edited", () => {
 const legacy = {round:5,slots:{1:["1","3","7","9","10"],2:["A","C","D","E","J"]},ready:{1:true,2:true}};
 const upgraded = normalizeGameState(legacy);
 assert.deepEqual(upgraded.slots,legacy.slots);
 assert.equal(upgraded.fatigue[1]["7"].availableRound,7);
 assert.equal(upgraded.fatigue[1]["9"].availableRound,8);
 const preparing = normalizeGameState({...legacy,ready:{1:true,2:false}});
 assert.equal(preparing.ready[1],false);
 assert.deepEqual(preparing.fatigue,{1:{},2:{}});
 assert.deepEqual(normalizeGameState(upgraded),upgraded);
});
