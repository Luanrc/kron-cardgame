import assert from "node:assert/strict";
// This test only changes the local preview database, never the hosted room.
const base="http://127.0.0.1:8787/api/room";
const read=async(player=1)=>(await fetch(base+"?player="+player)).json();
let room=await read();
async function act(player,action,expected=200) {
 const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({player,match:room.match,round:room.round,action})});
 const body=await response.json();
 assert.equal(response.status,expected,JSON.stringify(body));
 if(response.ok) room=body;
 return body;
}
if(room.result) await act(1,{type:"restart"});
assert.equal(room.round,1,"Start with a fresh local match.");
assert.ok(room.fields.every(field=>field.slots.every(card=>card===null)));
await act(1,{type:"select_deck",deck:"monk"});
await act(2,{type:"select_deck",deck:"monk"});
assert.deepEqual((await read("spectator")).decks,{1:"monk",2:"monk"});
await act(2,{type:"select_deck",deck:"warrior"});
await act(1,{type:"place",slot:0,card:"1"},400);
await act("spectator",{type:"select_deck",deck:"monk"},403);
async function fill(one,two) {
 for(let slot=0;slot<5;slot++) await Promise.all([
  act(1,{type:"place",slot,card:one[slot]}),
  act(2,{type:"place",slot,card:two[slot]}),
 ]);
}
await fill(["monk-1-1","monk-1-2","monk-1-7","monk-1-9","monk-1-10"],["A","B","J","D","F"]);
await act(1,{type:"ready"});
assert.equal((await read("spectator")).revealed,false);
assert.ok((await read(2)).fields[0].slots.every(card=>card==="hidden"));
await act(2,{type:"ready"});
const result=await read("spectator");
assert.deepEqual(result.life,{1:9,2:7});
assert.equal(result.battle[2].deflected[1],3);
assert.equal(result.battle[3].reflected[1],1);
assert.equal(result.battle[4].riposteTriggered[1],true);
assert.equal(result.battle[4].outgoing[1].defense,4);
assert.deepEqual(result.fatigue[0].cards.map(card=>card.card),["monk-1-7","monk-1-9","monk-1-10"]);
assert.deepEqual((await read(1)).battle,result.battle);
await act(1,{type:"reset"});
assert.deepEqual(room.decks,{1:"monk",2:"warrior"});
await act(1,{type:"select_deck",deck:"warrior"},400);
await act(1,{type:"place",slot:0,card:"monk-1-7"},400);
for(let cycle=0;cycle<10&&!room.result;cycle++) {
 await fill(["monk-1-1","monk-1-2","monk-1-3","monk-1-4","monk-1-5"],["A","B","D","E","C"]);
 await act(1,{type:"ready"}); await act(2,{type:"ready"});
 if(!room.result) await act(1,{type:"reset"});
}
assert.ok(room.result);
await act(1,{type:"restart"});
assert.deepEqual(room.decks,{1:"monk",2:"warrior"});
assert.deepEqual(room.life,{1:10,2:10});
assert.ok(room.fatigue.every(side=>side.cards.length===0));
console.log("Passed: independent deck selection, mixed combat, concealed cards, Deflect, Reflect, conditional riposte arrow, shared fatigue, deck locking and restart.");
