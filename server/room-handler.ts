// Next.js/Vercel talks to the existing authoritative room over HTTP.
// next.config.ts selects this module; Sites uses room-cloudflare.ts through tsconfig.
const defaultRoomApi = "https://kron-card-game-prototipo.lcmcontadoresonline.chatgpt.site/api/room";
const headers = { "Cache-Control": "no-store" };
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

async function forward(request: Request): Promise<Response> {
 const incoming = new URL(request.url);
 const origin = request.headers.get("origin");
 if (request.method === "POST" && origin && origin !== incoming.origin) return reply("Origem inválida.", 403);
 try {
  const upstream = new URL(process.env.KRON_ROOM_API_URL || defaultRoomApi);
  if (!["http:", "https:"].includes(upstream.protocol) || (upstream.origin === incoming.origin && upstream.pathname === incoming.pathname)) {
   return reply("Servidor da sala configurado incorretamente.", 503);
  }
  upstream.search = incoming.search;
  const body = request.method === "POST" ? await request.text() : undefined;
  if (body && body.length > 2048) return reply("Pedido muito grande.", 413);
  const response = await fetch(upstream, {
   method: request.method,
   headers: { "Content-Type": "application/json" },
   body,
   cache: "no-store",
   redirect: "error",
   signal: AbortSignal.timeout(10000),
  });
  // Never forward HTML errors, cookies or redirects from another service.
  if (!response.headers.get("content-type")?.includes("application/json")) return reply("Sala indisponível. Tente novamente.", 503);
  const data: unknown = await response.json();
  return Response.json(data, { status: response.status, headers });
 } catch { return reply("Sala indisponível. Tente novamente.", 503); }
}

export const GET = (request: Request) => forward(request);
export const POST = (request: Request) => forward(request);
