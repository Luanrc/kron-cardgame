import assert from "node:assert/strict";
import { base } from "./local-room.mjs";
let room=await(await fetch(base+"?player=spectator")).json();
async function read(player){return(await fetch(base+"?player="+player)).json();}
async function act(player,action,status=200){const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({player,match:room.match,round:room.round,action})});const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));if(response.ok)room=data;return data;}
async function fill(one,two){for(let slot=0;slot<5;slot++)for(const player of[1,2])if((player===1?one:two)[slot])await act(player,{type:"place",slot,card:(player===1?one:two)[slot]});}
await act(undefined,{type:"full_reset"});await act(1,{type:"select_deck",deck:"summoner"});assert.equal(room.life[1],11);
await act(1,{type:"place",slot:4,card:"summoner-1-6"},400);
await fill(["summoner-1-1","summoner-1-2","summoner-1-4","summoner-1-5","summoner-1-11"],["A","B","C","D","F"]);
await act(2,{type:"attack_target",slot:2,target:"creature"});await act(2,{type:"attack_target",slot:3,target:"creature"});
await act("spectator",{type:"attack_target",slot:2,target:"creature"},403);
assert.equal((await read(1)).attackTargets[2],null);assert.deepEqual((await read("spectator")).attackTargets,{1:null,2:null});
assert.ok((await read("spectator")).creatures[1].every(creature=>creature===null));
await act(1,{type:"ready"});await act(2,{type:"ready"});assert.equal(room.creatures[1][2].life,2);assert.equal(room.creatures[1][3].life,3);
assert.deepEqual(room.life,{1:11,2:9});assert.equal((await read("spectator")).attackTargets[2][3],"creature");
await nextRound(1);assert.ok(room.fields.every(field=>field.slots.every(card=>card===null)));assert.equal(room.creatures[1].filter(Boolean).length,2);
assert.equal((await read("spectator")).creatures[1][2].life,2);
await act(1,{type:"place",slot:2,card:"summoner-1-1"},400);
await act(1,{type:"place",slot:2,card:"summoner-1-6"});assert.equal((await read("spectator")).creatures[1][2].damage,1);assert.equal((await read("spectator")).fields[0].slots[2],null);
await act(1,{type:"place",slot:2,card:null});assert.ok(room.creatures[1][2]);
await act(1,{type:"place",slot:2,card:"summoner-1-6"});
await fill(["summoner-1-1","summoner-1-2",null,null,"summoner-1-3"],["A","B","C","J","D"]);
await act(2,{type:"attack_target",slot:3,target:"creature"});await act(2,{type:"attack_target",slot:4,target:"creature"});
await act(1,{type:"ready"});await act(1,{type:"attack_target",slot:3,target:"player"},400);await act(2,{type:"ready"});
assert.deepEqual(room.life,{1:10,2:6});assert.equal(room.creatures[1][3].life,1);assert.equal(room.creatures[1][2].temporaryDamage,1);
await nextRound(1);assert.equal(room.creatures[1][2].temporaryDamage,0);assert.equal(room.creatures[1][3].life,1);
await act(1,{type:"place",slot:4,card:"summoner-1-4"},400);
await act(undefined,{type:"full_reset"});assert.ok(Object.values(room.creatures).every(slots=>slots.every(creature=>creature===null)));
console.log("Passed: Summoner over HTTP, secret summons/targets, public persistent creatures, optional overlays, fatigue/uniqueness, unconditional Bear attack, fallback, ready lock and full reset.");

async function nextRound(player) { await act(player, { type: "reset" }); return act(player === 1 ? 2 : 1, { type: "reset" }); }
