import assert from "node:assert/strict";
// This test changes only the local preview database, never the hosted room.
import { base } from "./local-room.mjs";
const read=async(player=1)=>(await fetch(base+"?player="+player)).json();
let room=await read();
async function act(player,action,status=200,round=room.round) {
 const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({player,match:room.match,round,action})});
 const body=await response.json(); assert.equal(response.status,status,JSON.stringify(body));
 if(response.ok) room=body;
 return body;
}
if(room.result) await act(1,{type:"restart"});
assert.equal(room.round,1,"Start with a fresh local match and empty slots.");
assert.ok(room.fields.every(field=>field.slots.every(card=>card===null)));
await act(1,{type:"select_deck",deck:"rogue"});
await act(2,{type:"select_deck",deck:"monk"});
async function fill(one,two) {
 for(let slot=0;slot<5;slot++) await Promise.all([
  act(1,{type:"place",slot,card:one[slot]}),act(2,{type:"place",slot,card:two[slot]}),
 ]);
}
await fill(["rogue-1-1","rogue-1-3","rogue-1-9","rogue-1-10","rogue-1-2"],["monk-2-1","monk-2-3","monk-2-4","monk-2-2","monk-2-5"]);
await act(1,{type:"aim",card:"rogue-1-9",targets:[1,3]});
await act(1,{type:"aim",card:"rogue-1-10",targets:[1]});
await act(1,{type:"aim",card:"rogue-1-9",targets:[0,4]},400);
await act("spectator",{type:"aim",card:"rogue-1-9",targets:[1,3]},403);
assert.deepEqual((await read("spectator")).floating,{1:{},2:{}});
assert.deepEqual((await read(2)).floating,{1:{},2:{}});
await act(1,{type:"ready"});
await act(1,{type:"aim",card:"rogue-1-9",targets:[2,2]},400);
await act(2,{type:"ready"});
assert.deepEqual(room.life,{1:8,2:6});
assert.deepEqual(room.bleeding,{1:[0,0,0,0,0],2:[0,4,0,0,0]});
assert.equal(room.bleedingRound,2);
assert.deepEqual((await read("spectator")).floating[1]["rogue-1-9"],[1,3]);
const priorRound=room.round;
await nextRound(1);
assert.equal(room.round,2);
assert.deepEqual(room.floating,{1:{},2:{}});
await act(1,{type:"aim",card:"rogue-1-9",targets:[2,2]},409,priorRound);
await act(1,{type:"place",slot:4,card:"rogue-1-9"},400);
await fill(["rogue-1-1","rogue-1-2","rogue-1-5","rogue-1-6","rogue-1-8"],["monk-2-1","monk-2-9","monk-2-7","monk-2-2","monk-2-4"]);
await act(1,{type:"ready"}); await act(2,{type:"ready"});
assert.deepEqual(room.life,{1:8,2:2});
assert.equal(room.battle[1].bleedingTaken[2],4);
assert.equal(room.battle[1].reflected[2],0);
assert.ok(Object.values(room.bleeding).every(slots=>slots.every(count=>count===0)));
await nextRound(1);
await fill(["rogue-1-1","rogue-1-9","rogue-1-2","rogue-1-5","rogue-1-4"],["monk-2-1","monk-2-2","monk-2-3","monk-2-4","monk-2-5"]);
await act(1,{type:"ready"}); await act(2,{type:"ready"});
assert.deepEqual(room.result,{type:"win",winner:1});
await act(1,{type:"restart"});
assert.deepEqual(room.decks,{1:"rogue",2:"monk"});
assert.deepEqual(room.life,{1:9,2:10});
assert.ok(Object.values(room.bleeding).every(slots=>slots.every(count=>count===0)));
console.log("Passed: secret validated Floating, simultaneous split damage, doubled Bleeding, next-round persistence, immunity to Reflect, expiration, stale aims and restart.");

async function nextRound(player) { await act(player, { type: "reset" }); return act(player === 1 ? 2 : 1, { type: "reset" }); }
