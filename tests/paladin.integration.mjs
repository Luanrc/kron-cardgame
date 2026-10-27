import assert from "node:assert/strict";
// Only the local preview database. Start with a fresh match and empty slots.
const base="http://127.0.0.1:8787/api/room";
const read=async(player=1)=>(await fetch(base+"?player="+player)).json();
let room=await read();
async function act(player,action,status=200,round=room.round) {
 const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({player,match:room.match,round,action})});
 const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));
 if(response.ok)room=body;
 return body;
}
assert.equal(room.round,1);
assert.ok(room.fields.every(field=>field.slots.every(card=>card===null)));
await act(1,{type:"select_deck",deck:"paladin"});
await act(2,{type:"select_deck",deck:"warrior"});
assert.deepEqual(room.holyPower,{1:0,2:0});
async function fill(one,two) {
 for(let slot=0;slot<5;slot++)await Promise.all([
  act(1,{type:"place",slot,card:one[slot]}),act(2,{type:"place",slot,card:two[slot]}),
 ]);
}
await fill(["paladin-1-1","paladin-1-8","paladin-1-3","paladin-1-7","paladin-1-2"],["A","B","D","C","E"]);
await act(1,{type:"place",slot:4,card:"paladin-1-10"},400);
await act(1,{type:"holy_spend",card:"paladin-1-7",amount:6},400);
await act(1,{type:"holy_spend",card:"paladin-1-7",amount:2});
await act("spectator",{type:"holy_spend",card:"paladin-1-7",amount:0},403);
assert.deepEqual((await read("spectator")).holySpending,{1:{},2:{}});
assert.deepEqual((await read(2)).holySpending,{1:{},2:{}});
await act(1,{type:"ready"});
await act(1,{type:"holy_spend",card:"paladin-1-7",amount:4},400);
await act(2,{type:"ready"});
assert.deepEqual(room.life,{1:9,2:9});
assert.deepEqual(room.holyPower,{1:3,2:0});
assert.equal(room.battle[1].holyPowerGained[1],4);
assert.equal(room.battle[2].holyPowerGained[1],1);
assert.equal(room.battle[3].holyPowerSpent[1],2);
assert.equal(room.battle[3].holyValue[1],1);
assert.equal((await read("spectator")).holySpending[1]["paladin-1-7"],2);
assert.deepEqual((await read(1)).holyPower,room.holyPower);
await act(1,{type:"reset"});
assert.equal(room.holyPower[1],3);
assert.deepEqual(room.holySpending,{1:{},2:{}});
await fill(["paladin-1-1","paladin-1-10","paladin-1-3","paladin-1-2","paladin-1-5"],["A","B","D","C","E"]);
await act(1,{type:"aim",card:"paladin-1-10",targets:[0]},400);
await act(1,{type:"aim",card:"paladin-1-10",targets:[2]});
await act(1,{type:"holy_spend",card:"paladin-1-10",amount:2});
await act(1,{type:"ready"});await act(2,{type:"ready"});
assert.deepEqual(room.life,{1:9,2:8});
assert.equal(room.battle[2].defense[1],1);
assert.equal(room.holyPower[1],2);
assert.equal(room.battle[2].holyPowerGained[1],1);
assert.equal(room.battle[4].holyPowerGained[1],0);
assert.deepEqual((await read("spectator")).holyPower,{1:2,2:0});
console.log("Passed: private chosen spending, one X card per round, successful resource generation, same-round use, persistent balance, forward-only floating defense and public combat results.");
