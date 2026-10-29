import { test } from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../server/room-handler.ts";

test("Vercel forwards viewer queries and authoritative status without caching or private headers", async (t) => {
 t.mock.method(globalThis, "fetch", async (url, options) => {
  assert.equal(url.origin, "https://kron-card-game-prototipo.lcmcontadoresonline.chatgpt.site");
  assert.equal(url.search, "?player=spectator");
  assert.equal(options.cache, "no-store");
  assert.equal(options.redirect, "error");
  assert.deepEqual(options.headers, { "Content-Type": "application/json" });
  return Response.json({ error: "A rodada mudou." }, { status: 409, headers: { "Set-Cookie": "private=1" } });
 });
 const response = await GET(new Request("https://kron.vercel.app/api/room?player=spectator", { headers: { Cookie: "private=1", Authorization: "private" } }));
 assert.equal(response.status, 409);
 assert.equal(response.headers.get("cache-control"), "no-store");
 assert.equal(response.headers.get("set-cookie"), null);
 assert.deepEqual(await response.json(), { error: "A rodada mudou." });
});

test("Vercel relays same-origin actions without leaking the browser origin to Cloudflare", async (t) => {
 const body = JSON.stringify({ player: 1, match: 2, round: 1, action: { type: "ready" } });
 t.mock.method(globalThis, "fetch", async (_url, options) => {
  assert.equal(options.method, "POST");
  assert.equal(options.body, body);
  assert.equal(options.headers.Origin, undefined);
  return Response.json({ life: { 1: 9, 2: 12 } });
 });
 const response = await POST(new Request("https://kron.vercel.app/api/room", { method: "POST", headers: { Origin: "https://kron.vercel.app" }, body }));
 assert.equal(response.status, 200);
 assert.deepEqual(await response.json(), { life: { 1: 9, 2: 12 } });
});

test("Cross-origin and oversized actions are rejected before reaching the room", async (t) => {
 const mock = t.mock.method(globalThis, "fetch", () => { throw new Error("Should not reach upstream"); });
 assert.equal((await POST(new Request("https://kron.vercel.app/api/room", { method: "POST", headers: { Origin: "https://other.example" }, body: "{}" }))).status, 403);
 assert.equal((await POST(new Request("https://kron.vercel.app/api/room", { method: "POST", body: "x".repeat(2049) }))).status, 413);
 assert.equal(mock.mock.callCount(), 0);
});

test("Network and HTML upstream errors become a controlled room unavailable response", async (t) => {
 const mock = t.mock.method(globalThis, "fetch", async () => new Response("<html>Unavailable</html>"));
 const request = new Request("https://kron.vercel.app/api/room?player=1");
 assert.equal((await GET(request)).status, 503);
 mock.mock.mockImplementation(async () => { throw new Error("offline"); });
 assert.equal((await GET(request)).status, 503);
});
