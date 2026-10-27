"use client";
import { useEffect, useRef, useState } from "react";
type Message = { id: number; player: number; text: string };
export default function Home() {
 const [player, setPlayer] = useState<1 | 2 | null>(null);
 const [messages, setMessages] = useState<Message[]>([]);
 const [status, setStatus] = useState("Conectando…");
 const [sending, setSending] = useState(false);
 const [error, setError] = useState("");
 const bottom = useRef<HTMLDivElement>(null);
 useEffect(() => {
  if (!player) return;
  let active = true;
  let timer: ReturnType<typeof setTimeout>;
  const controller = new AbortController();
  async function refresh() {
   try {
    const response = await fetch("/api/room", { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error();
    const data = await response.json() as { messages: Message[] };
    if (active) { setMessages(data.messages); setStatus("Conectado à sala"); }
   } catch { if (active) setStatus("Reconectando…"); }
   finally { if (active) timer = setTimeout(refresh, 1000); }
  }
  refresh();
  return () => { active = false; clearTimeout(timer); controller.abort(); };
 }, [player]);
 useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length, messages.at(-1)?.id]);
 async function send() {
  if (!player || sending) return;
  setSending(true); setError("");
  try {
   const response = await fetch("/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player, requestId: crypto.randomUUID() }) });
   if (!response.ok) throw new Error();
   const data = await response.json() as { message: Message };
   setMessages(previous => [...previous.filter(message => message.id !== data.message.id), data.message].sort((a,b) => a.id-b.id).slice(-100));
  } catch { setError("Não foi possível enviar. Tente novamente."); }
  finally { setSending(false); }
 }
 return <main>
  <h1>Kron Card Game</h1><p className="subtitle">Protótipo 0.2</p>
  {!player ? <section aria-label="Escolher jogador">
   <p>Escolha seu jogador para entrar na sala.</p>
   <div className="buttons"><button onClick={() => setPlayer(1)}>Player 1</button><button onClick={() => setPlayer(2)}>Player 2</button></div>
  </section> : <section aria-label="Sala compartilhada">
   <div className="room-header"><h2>Sala única · Player {player}</h2><button className="secondary" onClick={() => { setPlayer(null); setMessages([]); setError(""); }}>Sair</button></div>
   <p className="status" role="status">{status}</p>
   <div className="battlefield" aria-label="Campo de batalha">
    <h3>Campo de batalha</h3>
    <div className="board-scroll" tabIndex={0} role="region" aria-label="Slots dos dois jogadores">
     <div className="board">
      {[player === 1 ? 2 : 1, player].map((side, row) => <div className="player-field" key={side}>
       <p className="field-label">Player {side} · {row === 0 ? "Oponente" : "Você"}</p>
       <div className="slot-row" role="group" aria-label={`Campo do Player ${side}`}>
        {[1, 2, 3, 4, 5].map(slot => <div className="card-slot" key={slot} aria-label={`Player ${side}, slot ${slot}`}>
         <span>Slot {slot}</span>
        </div>)}
       </div>
      </div>)}
     </div>
    </div>
   </div>
   <div className="messages" role="log" aria-label="Mensagens da sala" aria-live="polite" aria-relevant="additions">
    {messages.length === 0 ? <p className="empty">As mensagens dos dois jogadores aparecerão aqui.</p> : messages.map(message => <p key={message.id}><span className="sender">Player {message.player}</span>{message.text}</p>)}
    <div ref={bottom} />
   </div>
   <button disabled={sending} onClick={send}>{sending ? "Enviando…" : player === 1 ? "Enviar Hello World 1" : "Enviar Hello world 2"}</button>
   {error && <p className="error" role="alert">{error}</p>}
  </section>}
 </main>;
}
