import assert from "node:assert/strict";

// Only local preview: this script never mutates the hosted room.
const base = "http://127.0.0.1:8787/api/room";
const read = async player => (await fetch(base + "?player=" + player)).json();
let start = await read(1);
let round = start.round;
async function act(player, action, expected = 200, requestRound = round) {
 const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player, round: requestRound, action }) });
 const body = await response.json();
 assert.equal(response.status, expected, JSON.stringify(body));
 return body;
}
if (start.revealed) {
 start = await act(1, { type: "reset" });
 round = start.round;
}
assert.ok(start.fields.every(field => field.slots.every(card => card === null)), "Local room must be empty or already revealed before testing.");
await act(1, { type: "ready" }, 400);
await act(1, { type: "place", slot: 0, card: "A" }, 400);
for (const [slot,card] of ["1","3","4","5","6"].entries()) await act(1,{type:"place",slot,card});
await act(1,{type:"ready"},400);
for (let slot=1;slot<5;slot++) await act(1,{type:"place",slot,card:null});
for (const side of start.fatigue) {
 if (side.cards.length) await act(side.player,{type:"place",slot:0,card:side.cards[0].card},400);
}
for (let slot = 0; slot < 5; slot++) {
 await Promise.all([
  act(1, { type: "place", slot, card: String(slot + 1) }),
  act(2, { type: "place", slot, card: String.fromCharCode(65 + slot) }),
 ]);
}
await act(1, { type: "place", slot: 1, card: "1" }, 400);
let one = await read(1);
let two = await read(2);
assert.deepEqual(one.ownSlots, ["1", "2", "3", "4", "5"]);
assert.deepEqual(two.ownSlots, ["A", "B", "C", "D", "E"]);
assert.deepEqual(one.fields[1].slots, Array(5).fill("hidden"));
assert.deepEqual(two.fields[0].slots, Array(5).fill("hidden"));
const spectator = await read("spectator");
assert.deepEqual(spectator.ownSlots, []);
assert.ok(spectator.fields.every(field => field.slots.every(card => card === "hidden")));
for (const action of [{ type: "ready" }, { type: "place", slot: 0, card: "1" }, { type: "reset" }]) {
 await act("spectator", action, 403);
}
await act(1, { type: "ready" });
await act(1, { type: "place", slot: 0, card: "6" }, 400);
assert.equal((await read(2)).revealed, false);
await act(2, { type: "ready" });
one = await read(1);
two = await read(2);
assert.ok(one.revealed && two.revealed);
assert.deepEqual(one.fields, two.fields);
assert.deepEqual((await read("spectator")).fields, one.fields);
assert.deepEqual(one.fields[1].slots, ["A", "B", "C", "D", "E"]);
const reset = await act(1, { type: "reset" });
assert.equal(reset.round, round + 1);
assert.ok(reset.fields.every(field => !field.ready && field.slots.every(card => card === null)));
await act(2, { type: "ready" }, 409, round);
console.log("Passed: concurrent placements, validation, hidden cards, spectator read-only view, ready locking, shared reveal, reset and stale-round rejection.");
