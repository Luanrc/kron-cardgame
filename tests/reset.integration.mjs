import assert from "node:assert/strict";
// Local preview only. This test resets the local fixture, never the hosted room.
const base="http://127.0.0.1:8787/api/room";
let room=await(await fetch(base+"?player=spectator")).json();
async function request(body){const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{status:response.status,body:await response.json()};}
async function reset(){const response=await request({match:room.match,round:room.round,action:{type:"full_reset"}});assert.equal(response.status,200);room=response.body;}
async function act(player,action){const response=await request({player,match:room.match,round:room.round,action});assert.equal(response.status,200,JSON.stringify(response.body));room=response.body;}
await reset();
await act(1,{type:"select_deck",deck:"rogue"});await act(2,{type:"select_deck",deck:"paladin"});
for(const[slot,card]of ["rogue-1-1","rogue-1-2","rogue-1-3","rogue-1-10","rogue-1-9"].entries())await act(1,{type:"place",slot,card});
for(const[slot,card]of ["paladin-2-1","paladin-2-2","paladin-2-3","paladin-2-8","paladin-2-5"].entries())await act(2,{type:"place",slot,card});
await act(1,{type:"aim",card:"rogue-1-9",targets:[3,4]});await act(1,{type:"aim",card:"rogue-1-10",targets:[2]});
await act(1,{type:"ready"});await act(2,{type:"ready"});
assert.ok(room.holyPower[2]>0);assert.ok(room.bleeding[2][2]>0);assert.ok(room.fatigue.some(side=>side.cards.length));
const prior={match:room.match,round:room.round,epoch:room.lobbyReset};
await reset();
assert.equal(room.match,prior.match+1);assert.equal(room.round,1);assert.equal(room.lobbyReset,prior.epoch+1);
assert.deepEqual(room.decks,{1:"warrior",2:"warrior"});assert.deepEqual(room.life,{1:10,2:10});
assert.deepEqual(room.holyPower,{1:0,2:0});assert.deepEqual(room.floating,{1:{},2:{}});assert.deepEqual(room.holySpending,{1:{},2:{}});
assert.ok(room.fields.every(field=>!field.ready&&field.slots.every(card=>card===null)));assert.ok(room.fatigue.every(side=>!side.cards.length));
assert.ok(Object.values(room.bleeding).every(slots=>slots.every(count=>count===0)));assert.deepEqual(room.battle,[]);
assert.equal((await request({player:1,match:prior.match,round:prior.round,action:{type:"ready"}})).status,409);
assert.equal((await request({player:"spectator",match:room.match,round:room.round,action:{type:"full_reset"}})).status,403);
const payload={match:room.match,round:room.round,action:{type:"full_reset"}};
const duplicate=await Promise.all([request(payload),request(payload)]);
assert.deepEqual(duplicate.map(result=>result.status).sort(),[200,409]);
const latest=await(await fetch(base+"?player=spectator")).json();assert.equal(latest.lobbyReset,room.lobbyReset+1);
console.log("Passed: full reset from lobby, cleared decks and all effects/resources, stale actions rejected and concurrent reset applied once.");
