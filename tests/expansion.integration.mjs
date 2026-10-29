import assert from "node:assert/strict";
import { base } from "./local-room.mjs";
let room = await (await fetch(base + "?player=spectator")).json();
async function act(player, action, status = 200) {
 const response = await fetch(base, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({player,match:room.match,round:room.round,action}) });
 const body = await response.json();assert.equal(response.status,status,JSON.stringify(body));if(response.ok)room=body;return body;
}
async function reset() { await act(undefined,{type:"full_reset"}); }
async function fill(one,two) { for(let slot=0;slot<5;slot++)for(const player of[1,2])await act(player,{type:"place",slot,card:(player===1?one:two)[slot]}); }
await reset();await act(1,{type:"select_deck",deck:"gunner"});await act(2,{type:"select_deck",deck:"guardian"});
assert.deepEqual(room.life,{1:10,2:12});assert.equal(room.resources.ammo[1],6);
await act(1,{type:"place",slot:0,card:"gunner-1-8"});await act(1,{type:"place",slot:1,card:"gunner-1-10"},400);await act(1,{type:"place",slot:0,card:null});
await fill(["gunner-1-1","gunner-1-2","gunner-1-7","gunner-1-10","gunner-1-5"],["guardian-2-1","guardian-2-2","guardian-2-3","guardian-2-4","guardian-2-5"]);
await act(1,{type:"ready"});assert.equal(room.revealed,false);await act(2,{type:"ready"});
assert.equal(room.resources.ammo[1],3);assert.equal(room.battle[4].damageTaken[2],1,"delayed gunner hit remains in slot five");
await nextRound(1);assert.equal(room.resources.ammo[1],3);
await reset();await act(1,{type:"select_deck",deck:"mage"});assert.equal(room.life[1],8);assert.equal(room.resources.arcane[1],2);
await fill(["mage-1-1","mage-1-2","mage-1-10","mage-1-3","mage-1-5"],["A","B","C","D","E"]);
await act(1,{type:"ready"});await act(2,{type:"ready"});await nextRound(1);
assert.deepEqual(room.visions[1],{round:2,slot:null});
await act(2,{type:"place",slot:0,card:"D"},400);await act("spectator",{type:"foretell",slot:4},403);await act(2,{type:"foretell",slot:4});
await act(2,{type:"place",slot:4,card:null},400);
const seer=await(await fetch(base+"?player=1")).json();const spectator=await(await fetch(base+"?player=spectator")).json();
assert.equal(seer.fields.find(field=>field.player===2).slots[4],"A");assert.equal(spectator.fields.find(field=>field.player===2).slots[4],"hidden");assert.equal(spectator.visions[1].slot,null);
await reset();await act(1,{type:"select_deck",deck:"summoner"});assert.equal(room.life[1],11);
await act(1,{type:"select_deck",deck:"barbarian"});assert.equal(room.life[1],9);
await fill(["barbarian-1-1","barbarian-1-2","barbarian-1-10","barbarian-1-3","barbarian-1-4"],["A","B","C","D","E"]);
await act(1,{type:"ready"});await act(2,{type:"ready"});await nextRound(1);assert.equal(room.noActionOptional[1],true);
assert.equal(room.fatigue.find(side=>side.player===1).cards.find(card=>card.card==="barbarian-1-10").remainingRounds,3);
await reset();assert.deepEqual(room.resources,{ammo:{1:0,2:0},arcane:{1:0,2:0}});assert.deepEqual(room.visions,{1:null,2:null});assert.deepEqual(room.noActionOptional,{1:false,2:false});
console.log("Passed: new decks over HTTP, resource validation/persistence, delayed arrows, private Premonition and locked choice, Fury, playable Summoner and full reset.");

async function nextRound(player) { await act(player, { type: "reset" }); return act(player === 1 ? 2 : 1, { type: "reset" }); }
