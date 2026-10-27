import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyAction, roomView, cardsFor } from "../lib/game.ts";
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
 assert.deepEqual(reset,newGame(2));
});
