import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { messages } from "../../../db/schema";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function present(row: { id: number; player: number }) {
 return { id: row.id, player: row.player, text: row.player === 1 ? "Hello World 1" : "Hello world 2" };
}
export async function GET() {
 try {
  const rows = await getDb().select().from(messages).orderBy(desc(messages.id)).limit(100);
  return Response.json({ messages: rows.reverse().map(present) }, { headers });
 } catch { return Response.json({ error: "Sala indisponível." }, { status: 503, headers }); }
}
export async function POST(request: Request) {
 const origin = request.headers.get("origin");
 if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403, headers });
 try {
  const body = await request.text();
  if (body.length > 1024) return Response.json({ error: "Pedido muito grande." }, { status: 413, headers });
  let input;
  try { input = JSON.parse(body); } catch { return Response.json({ error: "JSON inválido." }, { status: 400, headers }); }
  if (!input || (input.player !== 1 && input.player !== 2) || typeof input.requestId !== "string" || !/^[0-9a-f-]{36}$/.test(input.requestId)) {
   return Response.json({ error: "Jogador ou pedido inválido." }, { status: 400, headers });
  }
  const db = getDb();
  await db.insert(messages).values({ player: input.player, requestId: input.requestId }).onConflictDoNothing();
  const [row] = await db.select().from(messages).where(eq(messages.requestId, input.requestId));
  return Response.json({ message: present(row) }, { headers });
 } catch { return Response.json({ error: "Falha ao enviar mensagem." }, { status: 503, headers }); }
}