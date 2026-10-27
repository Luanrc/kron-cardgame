import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { rooms } from "../../../db/schema";
import { applyAction, newGame, roomView, type GameAction, type GameState, type Player } from "../../../lib/game";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });
async function readRoom() {
 const db = getDb();
 await db.insert(rooms).values({ id: 1, version: 0, state: JSON.stringify(newGame()) }).onConflictDoNothing();
 const [room] = await db.select().from(rooms).where(eq(rooms.id, 1));
 return room;
}
export async function GET(request: Request) {
 const player = Number(new URL(request.url).searchParams.get("player"));
 if (player !== 1 && player !== 2) return reply({ error: "Jogador inválido." }, 400);
 try {
  const room = await readRoom();
  return reply(roomView(JSON.parse(room.state) as GameState, player, room.version));
 } catch { return reply({ error: "Sala indisponível. Tente novamente." }, 503); }
}
export async function POST(request: Request) {
 const origin = request.headers.get("origin");
 if (origin && origin !== new URL(request.url).origin) return reply({ error: "Origem inválida." }, 403);
 try {
  const raw = await request.text();
  if (raw.length > 2048) return reply({ error: "Pedido muito grande." }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return reply({ error: "JSON inválido." }, 400); }
  if (!input || (input.player !== 1 && input.player !== 2) || !Number.isInteger(input.round) || !input.action || !["place", "ready", "reset"].includes(input.action.type)) return reply({ error: "Pedido inválido." }, 400);
  const player: Player = input.player;
  for (let attempt = 0; attempt < 6; attempt++) {
   const room = await readRoom();
   const state = JSON.parse(room.state) as GameState;
   if (input.round !== state.round) return reply({ error: "A rodada mudou. Aguarde a atualização da sala." }, 409);
   let next;
   try { next = applyAction(state, player, input.action as GameAction); }
   catch (error) { return reply({ error: error instanceof Error ? error.message : "Ação inválida." }, 400); }
   const updated = await getDb().update(rooms).set({ state: JSON.stringify(next), version: room.version + 1 }).where(and(eq(rooms.id, 1), eq(rooms.version, room.version))).returning({ version: rooms.version });
   if (updated.length) return reply(roomView(next, player, updated[0].version));
  }
  return reply({ error: "A sala está ocupada. Tente novamente." }, 409);
 } catch { return reply({ error: "Não foi possível atualizar a sala. Tente novamente." }, 503); }
}
