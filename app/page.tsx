"use client";
import { useEffect, useRef, useState } from "react";
import { cardsFor, type GameAction, type Player, type Viewer, type RoomView } from "../lib/game";

export default function Home() {
 const [player, setPlayer] = useState<Viewer | null>(null);
 const [room, setRoom] = useState<RoomView | null>(null);
 const [selected, setSelected] = useState<string | null>(null);
 const [status, setStatus] = useState("Conectando…");
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const pending = useRef(false);
 const activePlayer = useRef<Viewer | null>(null);
 const updateRoom = (next: RoomView) => setRoom(previous => !previous || next.version >= previous.version ? next : previous);

 useEffect(() => {
  if (!player) return;
  let active = true;
  let timer: ReturnType<typeof setTimeout>;
  const controller = new AbortController();
  async function refresh() {
   try {
    const response = await fetch("/api/room?player=" + player, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error();
    const data = await response.json() as RoomView;
    if (active) { updateRoom(data); setStatus("Conectado à sala"); }
   } catch { if (active) setStatus("Reconectando…"); }
   finally { if (active) timer = setTimeout(refresh, 1000); }
  }
  refresh();
  return () => { active = false; clearTimeout(timer); controller.abort(); };
 }, [player]);

 useEffect(() => { setSelected(null); setError(""); }, [room?.round]);

 function enter(side: Viewer) {
  activePlayer.current = side; setPlayer(side); setRoom(null); setSelected(null); setError(""); setStatus("Conectando…");
 }
 function leave() {
  activePlayer.current = null; setPlayer(null); setRoom(null); setSelected(null); setError("");
 }
 async function act(action: GameAction) {
  if (!player || player === "spectator" || !room || pending.current) return;
  const side = player;
  pending.current = true; setBusy(true); setError("");
  try {
   const response = await fetch("/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player, round: room.round, action }) });
   const data = await response.json() as RoomView & { error?: string };
   if (!response.ok) throw new Error(data.error || "Não foi possível atualizar a sala.");
   if (activePlayer.current === side) { updateRoom(data); setSelected(null); }
  } catch (error) { if (activePlayer.current === side) setError(error instanceof Error ? error.message : "Falha de conexão. Tente novamente."); }
  finally { pending.current = false; setBusy(false); }
 }
 const own = room?.fields.find(field => field.player === player);
 const filled = room?.ownSlots.filter(Boolean).length ?? 0;
 const locked = busy || !room || !!own?.ready;
 return <main>
  <h1>Kron Card Game</h1><p className="subtitle">Protótipo 0.4</p>
  {!player ? <section aria-label="Escolher jogador">
   <p>Escolha como entrar na sala.</p>
   <div className="buttons"><button onClick={() => enter(1)}>Player 1</button><button onClick={() => enter(2)}>Player 2</button><button className="secondary" onClick={() => enter("spectator")}>Espectador</button></div>
  </section> : <section aria-label="Sala compartilhada">
   <div className="room-header"><h2>Sala única · {player === "spectator" ? "Espectador" : "Player " + player}</h2><button className="secondary" disabled={busy} onClick={leave}>Sair</button></div>
   <p className="status" role="status">{status}</p>
   {room && <>
    <p className={"phase " + (room.revealed ? "revealed" : "")} role="status">
     {room.revealed ? "Ambos prontos. Cartas reveladas!" : player === "spectator" ? "Assistindo à preparação. As cartas serão reveladas quando ambos estiverem prontos." : own?.ready ? "Você está pronto. Aguardando o oponente…" : "Escolha 5 cartas e coloque uma em cada slot."}
    </p>
    <div className="battlefield" aria-label="Campo de batalha">
     <h3>Campo de batalha</h3>
     <div className="board-scroll" tabIndex={0} role="region" aria-label="Slots dos dois jogadores">
      <div className="board">
       {(player === "spectator" ? [2, 1] as Player[] : [player === 1 ? 2 : 1, player] as Player[]).map(side => {
        const field = room.fields.find(item => item.player === side)!;
        return <div className={"player-field player-" + side} key={side}>
         <p className="field-label">Player {side}{player !== "spectator" && (side === player ? " · Você" : " · Oponente")} <span className="field-status">{field.slots.filter(Boolean).length}/5 · {field.ready ? "Pronto" : "Preparando"}</span></p>
         <div className="slot-row" role="group" aria-label={"Campo do Player " + side}>
          {field.slots.map((card, slot) => {
           const label = "Player " + side + ", slot " + (slot + 1);
           const content = <><span className="slot-number">Slot {slot + 1}</span><span className="card-face">{card === null ? "Vazio" : room.revealed ? card : "Virada"}</span></>;
           const className = "card-slot " + (card ? room.revealed ? "face-up" : "face-down" : "empty-slot");
           return side === player ? <button key={slot} className={className} disabled={locked || (!selected && !card)} aria-label={label + (card ? room.revealed ? ", carta " + card : ", carta virada" : ", vazio")} onClick={() => act({ type: "place", slot, card: selected })}>{content}</button>
            : <div key={slot} className={className} aria-label={label + (card ? room.revealed ? ", carta " + card : ", carta virada" : ", vazio")}>{content}</div>;
          })}
         </div>
        </div>;
       })}
      </div>
     </div>
    </div>
    {player !== "spectator" && !room.revealed && <div className={"hand player-" + player} aria-label="Sua mão">
     <h3>Sua mão <span className="field-status">{10 - filled} disponíveis</span></h3>
     <p className="hint">{own?.ready ? "Suas cartas estão travadas até a revelação." : selected ? "Carta " + selected + " selecionada. Clique no slot de destino." : "Clique em uma carta e depois em um slot. Para retirar, clique em um slot ocupado sem carta selecionada."}</p>
     <div className="hand-cards">
      {cardsFor(player).map(card => {
       const slot = room.ownSlots.indexOf(card);
       return <button key={card} className={"hand-card " + (selected === card ? "selected" : "")} disabled={locked || slot !== -1} aria-pressed={selected === card} aria-label={"Carta " + card + (slot !== -1 ? ", no slot " + (slot + 1) : "")} onClick={() => setSelected(selected === card ? null : card)}>
        <span>{card}</span>{slot !== -1 && <small>Slot {slot + 1}</small>}
       </button>;
      })}
     </div>
    </div>}
    {player !== "spectator" && <div className="actions">
     {!room.revealed && !own?.ready && filled === 5 && <button className="ready-button" disabled={busy} onClick={() => act({ type: "ready" })}>{busy ? "Salvando…" : "Pronto"}</button>}
     {!room.revealed && !own?.ready && filled < 5 && <p className="hint">Preencha os 5 slots para ficar pronto. ({filled}/5)</p>}
     {room.revealed && <button className="secondary" disabled={busy} onClick={() => act({ type: "reset" })}>Nova rodada</button>}
    </div>}
   </>}
   {error && <p className="error" role="alert">{error}</p>}
  </section>}
 </main>;
}
