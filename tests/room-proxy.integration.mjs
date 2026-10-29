import assert from "node:assert/strict";
import { GET, POST } from "../server/room-handler.ts";
import { base } from "./local-room.mjs";

// Exercise the actual Next handler against the local D1 server, never production.
process.env.KRON_ROOM_API_URL = base;
const frontend = "http://localhost:3000/api/room";
let response = await GET(new Request(frontend + "?player=spectator"));
assert.equal(response.status, 200);
let room = await response.json();
async function act(player, action) {
 const response = await POST(new Request(frontend, {
  method: "POST", headers: { Origin: "http://localhost:3000" },
  body: JSON.stringify({ player, match: room.match, round: room.round, action }),
 }));
 assert.equal(response.status, 200, await response.clone().text());
 room = await response.json();
}
await act(undefined, { type: "full_reset" });
await act(1, { type: "select_deck", deck: "rogue" });
await act(2, { type: "select_deck", deck: "paladin" });
assert.deepEqual(room.life, { 1: 9, 2: 12 });
for (const [slot, card] of ["rogue-1-1", "rogue-1-2", "rogue-1-3", "rogue-1-4", "rogue-1-5"].entries()) await act(1, { type: "place", slot, card });
for (const [slot, card] of ["paladin-2-1", "paladin-2-2", "paladin-2-3", "paladin-2-4", "paladin-2-5"].entries()) await act(2, { type: "place", slot, card });
await act(1, { type: "ready" });
const hidden = await (await GET(new Request(frontend + "?player=spectator"))).json();
assert.ok(hidden.fields.every(field => field.slots.every(card => card === "hidden")));
await act(2, { type: "ready" });
assert.equal(room.revealed, true);
assert.deepEqual(room.life, { 1: 7, 2: 10 });
await nextRound(1);
assert.deepEqual(room.life, { 1: 7, 2: 10 });
await act(undefined, { type: "full_reset" });
assert.deepEqual(room.life, { 1: 10, 2: 10 });
console.log("Passed: Next room handler -> local Cloudflare D1, independent decks, life, hidden cards, reveal, simultaneous damage, next round and full reset.");

async function nextRound(player) { await act(player, { type: "reset" }); return act(player === 1 ? 2 : 1, { type: "reset" }); }
