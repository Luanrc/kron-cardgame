"use client";
import { useEffect, useRef, useState } from "react";
import { cardsFor, requiredCardsFor, type GameAction, type Player, type Viewer, type RoomView } from "../lib/game";
import { CardZoom } from "../components/card-zoom";
import { CardText } from "../components/card-text";
import { definitionFor, cardDescription, isMandatoryCard, deckOptions, classNameFor, initialLifeFor, type DeckId } from "../lib/cards";
import { FatiguePanel } from "../components/fatigue-panel";
import { LifePool, BattleSummary } from "../components/battle-summary";
import { FloatingPanel, FloatingSummary } from "../components/floating-panel";
import { HolyPowerPanel } from "../components/holy-power-panel";

export default function Home() {
 const [player, setPlayer] = useState<Viewer | null>(null);
 const [chosenPlayer, setChosenPlayer] = useState<Player | null>(null);
 const [chosenDeck, setChosenDeck] = useState<DeckId | null>(null);
 const [room, setRoom] = useState<RoomView | null>(null);
 const [selected, setSelected] = useState<string | null>(null);
 const [status, setStatus] = useState("Conectando…");
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const [notice, setNotice] = useState("");
 const pending = useRef(false);
 const activePlayer = useRef<Viewer | null>(null);
 const activeReset = useRef<number | null>(null);
 const entryGeneration = useRef(0);
 const updateRoom = (next: RoomView) => {
  if (activeReset.current !== null && next.lobbyReset !== activeReset.current) {
   leave(); setNotice("A partida foi resetada. Escolha novamente como entrar."); return false;
  }
  activeReset.current = next.lobbyReset;
  setRoom(previous => !previous || next.version >= previous.version ? next : previous);
  return true;
 };

 useEffect(() => {
  const viewer = player ?? (chosenPlayer ? "spectator" : null);
  if (!viewer) return;
  let active = true;
  let timer: ReturnType<typeof setTimeout>;
  const controller = new AbortController();
  async function refresh() {
   try {
    const response = await fetch("/api/room?player=" + viewer, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error();
    const data = await response.json() as RoomView;
    if (active && updateRoom(data)) setStatus("Conectado à sala");
   } catch { if (active) setStatus("Reconectando…"); }
   finally { if (active) timer = setTimeout(refresh, 1000); }
  }
  refresh();
  return () => { active = false; clearTimeout(timer); controller.abort(); };
 }, [player, chosenPlayer]);

 useEffect(() => { setSelected(null); setError(""); }, [room?.match, room?.round, room?.decks[1], room?.decks[2]]);

 function enter(side: Viewer) {
  activeReset.current = null; setNotice("");
  setChosenPlayer(null); setChosenDeck(null);
  activePlayer.current = side; setPlayer(side); setRoom(null); setSelected(null); setError(""); setStatus("Conectando…");
 }
 function choosePlayer(side: Player) {
  entryGeneration.current++; activeReset.current = null;
  setChosenPlayer(side); setChosenDeck(null); setError(""); setNotice("");
 }
 async function confirmDeck() {
  if (!chosenPlayer || !chosenDeck || pending.current) return;
  pending.current = true; setBusy(true); setError("");
  const generation = entryGeneration.current;
  try {
   const current = await fetch("/api/room?player=" + chosenPlayer, { cache: "no-store" });
   if (!current.ok) throw new Error("Não foi possível conectar à sala. Tente novamente.");
   const snapshot = await current.json() as RoomView;
   if (generation !== entryGeneration.current) return;
   const response = await fetch("/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player: chosenPlayer, match: snapshot.match, round: snapshot.round, action: { type: "select_deck", deck: chosenDeck } }) });
   const data = await response.json() as RoomView & { error?: string };
   if (!response.ok) throw new Error(data.error || "Não foi possível escolher o baralho.");
   if (generation !== entryGeneration.current) return;
   enter(chosenPlayer); updateRoom(data); setStatus("Conectado à sala");
  } catch (error) { setError(error instanceof Error ? error.message : "Falha de conexão. Tente novamente."); }
  finally { pending.current = false; setBusy(false); }
 }
 function leave() {
  entryGeneration.current++; activeReset.current = null;
  setChosenPlayer(null); setChosenDeck(null);
  activePlayer.current = null; setPlayer(null); setRoom(null); setSelected(null); setError("");
 }
 async function fullReset() {
  if (pending.current) return;
  pending.current = true; setBusy(true); setError(""); setNotice("");
  try {
   const current = await fetch("/api/room?player=spectator", { cache: "no-store" });
   if (!current.ok) throw new Error("Não foi possível conectar à sala.");
   const snapshot = await current.json() as RoomView;
   const response = await fetch("/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match: snapshot.match, round: snapshot.round, action: { type: "full_reset" } }) });
   const data = await response.json() as { error?: string };
   if (!response.ok) throw new Error(data.error || "Não foi possível resetar a partida.");
   leave(); setNotice("Partida resetada. Todas as escolhas e o estado da sala foram limpos.");
  } catch (error) { setError(error instanceof Error ? error.message : "Falha de conexão. Tente novamente."); }
  finally { pending.current = false; setBusy(false); }
 }
 async function act(action: GameAction) {
  if (!player || player === "spectator" || !room || pending.current) return;
  const side = player;
  pending.current = true; setBusy(true); setError("");
  try {
   const response = await fetch("/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player, match: room.match, round: room.round, action }) });
   const data = await response.json() as RoomView & { error?: string };
   if (!response.ok) throw new Error(data.error || "Não foi possível atualizar a sala.");
   if (activePlayer.current === side) { updateRoom(data); setSelected(null); }
  } catch (error) { if (activePlayer.current === side) setError(error instanceof Error ? error.message : "Falha de conexão. Tente novamente."); }
  finally { pending.current = false; setBusy(false); }
 }
 const own = room?.fields.find(field => field.player === player);
 const filled = room?.ownSlots.filter(Boolean).length ?? 0;
 const locked = busy || !room || !!own?.ready || !!room.result;
 const fatiguedCards = room?.fatigue.find(side => side.player === player)?.cards.map(entry => entry.card) ?? [];
 const handCards = player && player !== "spectator" && room ? cardsFor(player, room.decks[player]).filter(card => !fatiguedCards.includes(card)) : [];
 const required = player && player !== "spectator" && room ? requiredCardsFor(player, room.decks[player]) : [];
 const missingRequired = required.filter(card => !room?.ownSlots.includes(card));
 return <main>
  <h1>Kron Card Game</h1><p className="subtitle">Protótipo 0.14 · Escolha sua classe, prepare seus cinco slots.</p>
  {!player && !chosenPlayer ? <section aria-label="Escolher jogador">
   <p>Escolha como entrar na sala.</p>
   <div className="buttons"><button disabled={busy} onClick={() => choosePlayer(1)}>Player 1</button><button disabled={busy} onClick={() => choosePlayer(2)}>Player 2</button><button className="secondary" disabled={busy} onClick={() => enter("spectator")}>Espectador</button></div>
   <div className="lobby-reset"><button className="secondary reset-button" disabled={busy} onClick={fullReset}>{busy ? "Resetando…" : "Resetar partida"}</button><span>Limpa a sala para os dois jogadores.</span></div>
   {notice && <p className="notice" role="status">{notice}</p>}
   {error && <p className="error" role="alert">{error}</p>}
  </section> : !player && chosenPlayer ? <section aria-label="Escolher baralho">
   <div className="room-header"><h2>Player {chosenPlayer} · Escolha seu baralho</h2><button className="secondary" disabled={busy} onClick={leave}>Voltar</button></div>
   <p>Selecione um baralho para entrar na sala.</p>
   <div className="deck-options">{deckOptions.map(deck => <label key={deck.id} className={"deck-option deck-" + deck.id + " " + (chosenDeck === deck.id ? "deck-selected" : "")}>
    <input type="radio" name="deck" value={deck.id} checked={chosenDeck === deck.id} disabled={busy} onChange={() => { setChosenDeck(deck.id); setError(""); }} aria-label={deck.name} />
    <span><strong>{deck.name}</strong><span className="deck-description">{deck.description}</span><small>{cardsFor(chosenPlayer, deck.id).length} cartas · {initialLifeFor(deck.id)} pontos de vida</small></span>
   </label>)}</div>
   <div className="actions"><button className="enter-room" disabled={!chosenDeck || busy} onClick={confirmDeck}>{busy ? "Entrando…" : "Entrar na sala"}</button></div>
   {error && <p className="error" role="alert">{error}</p>}
  </section> : player ? <section aria-label="Sala compartilhada">
   <div className="room-header"><h2>Sala única · {player === "spectator" ? "Espectador" : "Player " + player}</h2><button className="secondary" disabled={busy} onClick={leave}>Sair</button></div>
   <p className="status" role="status">{status}</p>
   {room && <>
    <p className="round-label">Partida {room.match} · Rodada {room.round}</p>
    <LifePool room={room} />
    <BattleSummary room={room} />
    <FloatingSummary room={room} />
    <p className={"phase " + (room.revealed ? "revealed" : "")} role="status">
     {room.result ? "Fim da partida." : room.revealed ? "Ambos prontos. Cartas reveladas!" : player === "spectator" ? "Assistindo à preparação. As cartas serão reveladas quando ambos estiverem prontos." : own?.ready ? "Você está pronto. Aguardando o oponente…" : "Escolha 5 cartas e coloque uma em cada slot."}
    </p>
    <div className="battlefield" aria-label="Campo de batalha">
     <h3>Campo de batalha</h3>
     <div className="board-scroll" tabIndex={0} role="region" aria-label="Slots dos dois jogadores">
      <div className="board">
       {(player === "spectator" ? [2, 1] as Player[] : [player === 1 ? 2 : 1, player] as Player[]).map(side => {
        const field = room.fields.find(item => item.player === side)!;
        return <div className={"player-field player-" + side + " deck-" + room.decks[side]} key={side}>
         <p className="field-label">Player {side} · {classNameFor(room.decks[side])}{player !== "spectator" && (side === player ? " · Você" : " · Oponente")} <span className="field-status">{field.slots.filter(Boolean).length}/5 · {field.ready ? "Pronto" : "Preparando"}</span></p>
         <div className="slot-row" role="group" aria-label={"Campo do Player " + side}>
          {field.slots.map((card, slot) => {
           const label = "Player " + side + ", slot " + (slot + 1);
           const definition = room.revealed && card ? definitionFor(side, card) : undefined;
           const face = definition ? <CardText card={definition} /> : card === null ? "Vazio" : "Virada";
           const cardLabel = definition ? ", " + cardDescription(definition) : card ? ", carta virada" : ", vazio";
           const bleeding = room.bleeding[side][slot];
           const content = <><span className="slot-number">Slot {slot + 1}</span><span className="card-face">{face}</span>{bleeding > 0 && <span className="bleeding-badge">Sangramento {bleeding} · R{room.bleedingRound}</span>}</>;
           const className = "card-slot " + (card ? room.revealed ? "face-up" : "face-down" : "empty-slot");
           return <CardZoom key={slot} side={side} deck={room.decks[side]} value={face} previewValue={definition ? <CardText card={definition} detailed /> : face} caption={"Player " + side + " · Slot " + (slot + 1)} enabled={card !== null} hiddenCard={!room.revealed} focusable={side !== player || locked}>
            {side === player ? <button className={className} disabled={locked || (!selected && !card)} aria-label={label + cardLabel} onClick={() => act({ type: "place", slot, card: selected })}>{content}</button>
            : <div className={className} aria-label={label + cardLabel}>{content}</div>}
           </CardZoom>;
          })}
         </div>
        </div>;
       })}
      </div>
     </div>
    {Object.values(room.bleeding).some(slots => slots.some(Boolean)) && <p className="bleeding-note" role="status">Sangramento para a rodada {room.bleedingRound}: cada marcador causa 1 de dano no slot indicado e depois desaparece. Defesa e Defletir podem bloquear; Refletir não.</p>}
    <FatiguePanel fatigue={room.fatigue} />
    </div>
    {player !== "spectator" && !room.revealed && <div className={"hand player-" + player + " deck-" + room.decks[player]} aria-label="Sua mão">
     <h3>Sua mão <span className="field-status">{handCards.length - filled} disponíveis</span></h3>
     <p className="required-note">As {required.length} cartas “Não age” são obrigatórias nesta rodada e não têm Fadiga. {missingRequired.length > 0 ? "Faltam " + missingRequired.length + " no campo." : "Todas estão no campo."}</p>
     <p className="hint">{own?.ready ? "Suas cartas estão travadas até a revelação." : selected ? "Carta " + definitionFor(player, selected)?.number + " selecionada. Clique no slot de destino." : "Clique em uma carta e depois em um slot. Para retirar, clique em um slot ocupado sem carta selecionada."}</p>
     <div className="hand-cards">
      {handCards.map(card => {
       const slot = room.ownSlots.indexOf(card);
       const definition = definitionFor(player, card)!;
       return <CardZoom key={card} side={player} deck={definition.classId} value={<CardText card={definition} />} previewValue={<CardText card={definition} detailed />} caption="Sua mão" focusable={locked || slot !== -1}><button className={"hand-card " + (selected === card ? "selected" : "")} disabled={locked || slot !== -1} aria-pressed={selected === card} aria-label={cardDescription(definition) + (slot !== -1 ? ", no slot " + (slot + 1) : "")} onClick={() => setSelected(selected === card ? null : card)}>
        <CardText card={definition} />{isMandatoryCard(definition) && <small className="mandatory-badge">Obrigatória</small>}{slot !== -1 && <small>Slot {slot + 1}</small>}
       </button></CardZoom>;
      })}
     </div>
     <FloatingPanel room={room} player={player} locked={locked} onAim={(card, targets) => act({ type: "aim", card, targets })} />
     <HolyPowerPanel room={room} player={player} locked={locked} onSave={(card, amount) => act({ type: "holy_spend", card, amount })} />
    </div>}
    {player !== "spectator" && <div className="actions">
     {!room.revealed && !own?.ready && filled === 5 && missingRequired.length === 0 && <button className="ready-button" disabled={busy} onClick={() => act({ type: "ready" })}>{busy ? "Salvando…" : "Pronto"}</button>}
     {!room.revealed && !own?.ready && filled === 5 && missingRequired.length > 0 && <p className="required-note" role="status">Inclua todas as cartas “Não age” para poder clicar em Pronto.</p>}
     {!room.revealed && !own?.ready && filled < 5 && <p className="hint">Preencha os 5 slots para ficar pronto. ({filled}/5)</p>}
     {room.revealed && !room.result && <button className="secondary" disabled={busy} onClick={() => act({ type: "reset" })}>Nova rodada</button>}
     {room.result && <button className="secondary" disabled={busy} onClick={() => act({ type: "restart" })}>Nova partida</button>}
    </div>}
   </>}
   {error && <p className="error" role="alert">{error}</p>}
  </section> : null}
 </main>;
}
