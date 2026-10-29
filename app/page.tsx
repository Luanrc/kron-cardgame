"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { cardsFor, type GameAction, type Player, type Viewer, type RoomView } from "../lib/game";
import { deckOptions, initialLifeFor, isDeckPlayable, type DeckId } from "../lib/cards";
import { DeckPreview } from "../components/deck-preview";
import { DuelTable } from "../components/duel-table";
import { QuickTutorial } from "../components/quick-tutorial";

export default function Home() {
 const [player, setPlayer] = useState<Viewer | null>(null);
 const [chosenPlayer, setChosenPlayer] = useState<Player | null>(null);
 const [chosenDeck, setChosenDeck] = useState<DeckId | null>(null);
 const [room, setRoom] = useState<RoomView | null>(null);

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

 const receivePoll = useEffectEvent((next: RoomView) => updateRoom(next));
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
    if (active && receivePoll(data)) setStatus("Conectado à sala");
   } catch { if (active) setStatus("Reconectando…"); }
   finally { if (active) timer = setTimeout(refresh, 1000); }
  }
  refresh();
  return () => { active = false; clearTimeout(timer); controller.abort(); };
 }, [player, chosenPlayer]);


 function enter(side: Viewer) {
  activeReset.current = null; setNotice("");
  setChosenPlayer(null); setChosenDeck(null);
  activePlayer.current = side; setPlayer(side); setRoom(null); setError(""); setStatus("Conectando…");
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
  activePlayer.current = null; setPlayer(null); setRoom(null); setError("");
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
   if (activePlayer.current === side) { updateRoom(data); }
  } catch (error) { if (activePlayer.current === side) setError(error instanceof Error ? error.message : "Falha de conexão. Tente novamente."); }
  finally { pending.current = false; setBusy(false); }
 }
 if (player) return <DuelTable room={room} player={player} busy={busy} status={status} error={error} onAction={act} onLeave={leave} />;
 return <main>
  <h1>Kron Card Game</h1><p className="subtitle">Protótipo 0.15 · Escolha sua classe, prepare seus cinco slots.</p>
  {!player && !chosenPlayer ? <section aria-label="Escolher jogador">
   <p>Escolha como entrar na sala.</p>
   <div className="buttons"><button disabled={busy} onClick={() => choosePlayer(1)}>Player 1</button><button disabled={busy} onClick={() => choosePlayer(2)}>Player 2</button><button className="secondary" disabled={busy} onClick={() => enter("spectator")}>Espectador</button></div>
   <QuickTutorial />
   <a className="prototype-entry" href="/mockup">Abrir simulação local →</a>
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
   {chosenDeck && <DeckPreview deck={chosenDeck} />}
   <div className="actions"><button className="enter-room" disabled={!chosenDeck || !isDeckPlayable(chosenDeck) || busy} onClick={confirmDeck}>{busy ? "Entrando…" : "Entrar na sala"}</button></div>
   {error && <p className="error" role="alert">{error}</p>}
  </section> : null}
 </main>;
}
