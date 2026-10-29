"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ChevronRight, Heart, Shield, Swords } from "lucide-react";
import { cardsFor, requiredCardsFor, isSummonActive, type GameAction, type RoomView, type Player, type Viewer } from "../lib/game";
import { cardDescription, classNameFor, definitionFor, isMandatoryCard } from "../lib/cards";
import { canPlaceOnTable, deckTableColors, tableSides, tableSlot } from "../lib/table-view";
import { RoundTimer } from "./round-timer";
import { TableScene } from "./table-scene";
import { CardText } from "./card-text";
import { CardZoom } from "./card-zoom";
import { FramedCard } from "./framed-card";
import { ClassSymbol } from "./class-symbol";
import { CreatureText, AttackTargetPanel } from "./creature-panel";
import { PremonitionPanel, ResourcePanel } from "./resource-panel";
import { FloatingPanel, FloatingSummary } from "./floating-panel";
import { HolyPowerPanel } from "./holy-power-panel";
import { BattleSummary } from "./battle-summary";
import "../app/mockup/mockup.css";
import "./duel-table.css";

type Props = { room: RoomView | null; player: Viewer; busy: boolean; status: string; error: string; onAction: (action: GameAction) => Promise<void>; onLeave: () => void };

 function DuelHero({ side, room, player }: { side: Player; room: RoomView; player: Viewer }) {
  if (!room) return null;
  const deck = room.decks[side];
  const resource = deck === "gunner" ? `Munição ${room.resources.ammo[side]}/6` : deck === "mage" ? `Arcano ${room.resources.arcane[side]}` : deck === "paladin" ? `Poder Sagrado ${room.holyPower[side]}` : null;
  return <div className={"mock-hero deck-" + deck} aria-label={`Player ${side}, ${room.life[side]} de vida`}>
   <div className="mock-hero-icon"><ClassSymbol deck={deck} size={27} /></div>
   <div><span>{player === side ? "VOCÊ · " : ""}PLAYER {side} · {room.fields.find(field => field.player === side)?.ready ? "PRONTO" : "PREPARANDO"}</span><strong>{classNameFor(deck)}</strong>{resource && <small className="duel-resource">{resource}</small>}</div>
   <div className="mock-health"><Heart size={14} fill="currentColor" /><b>{room.life[side]}</b><small>/ {room.initialLife[side]}</small></div>
  </div>;
 }

export function DuelTable({ room, player, busy, status, error, onAction, onLeave }: Props) {
 const [warningVersion, setWarningVersion] = useState(0);
 const [selected, setSelected] = useState<string | null>(null);
 const [dragged, setDragged] = useState<string | null>(null);
 const [dropTarget, setDropTarget] = useState<number | null>(null);
 const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
 const dragSession = useRef<{ card: string; x: number; y: number; active: boolean } | null>(null);
 const ignoreClickUntil = useRef(0);
 const [three, setThree] = useState(true);
 const [reducedMotion, setReducedMotion] = useState(false);
 const [activeSlot, setActiveSlot] = useState(-1);
 const lastPhase = useRef<string | null>(null);
 const [top, bottom] = tableSides(player);
 const own = room?.fields.find(field => field.player === player);
 const vision = room && player !== "spectator" ? room.visions[player === 1 ? 2 : 1] : null;
 const waitingForVision = !!room && vision?.round === room.round && vision.slot === null;
 const locked = busy || !room || !!own?.ready || !!room.result || !!room.revealed || waitingForVision || room?.preparationStartedAt === null;
 const fatigued = room?.fatigue.find(side => side.player === player)?.cards.map(entry => entry.card) ?? [];
 const hand = room && player !== "spectator" ? cardsFor(player, room.decks[player]).filter(card => !fatigued.includes(card)) : [];
 const required = room && player !== "spectator" && !room.noActionOptional[player] ? requiredCardsFor(player, room.decks[player]) : [];
 const missing = required.filter(card => !room?.ownSlots.includes(card));
 const filled = room && player !== "spectator" ? room.ownSlots.filter((card, slot) => card || room.creatures[player][slot]).length : 0;
 const needsForetell = !!room && player !== "spectator" && room.visions[player]?.round === room.round && room.visions[player]?.slot === null;
 const canAttemptReady = !locked && !needsForetell;
 const candidate = dragged ?? selected;
 const roundKey = [player, room?.match, room?.round, room?.decks[1], room?.decks[2]].join(":");

 function cancelDrag() { dragSession.current = null; setDragged(null); setDragPoint(null); setDropTarget(null); }
 useEffect(() => {
  const frame = requestAnimationFrame(() => { cancelDrag(); setSelected(null); });
  return () => cancelAnimationFrame(frame);
 }, [roundKey]);
 useEffect(() => {
  if (!locked) return;
  const frame = requestAnimationFrame(() => { cancelDrag(); setSelected(null); });
  return () => cancelAnimationFrame(frame);
 }, [locked]);
 useEffect(() => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => setReducedMotion(preference.matches);
  sync(); preference.addEventListener("change", sync);
  return () => preference.removeEventListener("change", sync);
 }, []);
 // Animate only a live reveal transition. Polls and joining a revealed room
 // show authoritative results without replaying or recomputing the battle.
 useEffect(() => {
  if (!room) return;
  const preparing = `${room.match}:${room.round}:prepare`;
  const phase = room.revealed ? `${room.match}:${room.round}:revealed` : preparing;
  if (phase !== lastPhase.current) {
   setActiveSlot(room.revealed && lastPhase.current === preparing && !reducedMotion ? 0 : -1);
   lastPhase.current = phase;
  }
 }, [room, reducedMotion]);
 useEffect(() => {
  if (activeSlot < 0 || !room?.revealed) return;
  const timer = window.setTimeout(() => setActiveSlot(slot => slot + 1 < room.battle.length ? slot + 1 : -1), reducedMotion ? 0 : 650);
  return () => window.clearTimeout(timer);
 }, [activeSlot, room?.revealed, room?.battle.length, reducedMotion]);
 useEffect(() => {
  if (!dragged) return;
  const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancelDrag(); };
  window.addEventListener("keydown", escape);
  return () => window.removeEventListener("keydown", escape);
 }, [dragged]);
 function targetAt(x: number, y: number) {
  const element = document.elementFromPoint(x, y)?.closest<HTMLButtonElement>("[data-drop-slot]");
  return element && !element.disabled ? Number(element.dataset.dropSlot) : null;
 }
 function beginDrag(event: PointerEvent<HTMLButtonElement>, card: string, unavailable: boolean) {
  if (unavailable || event.button !== 0) return;
  dragSession.current = { card, x: event.clientX, y: event.clientY, active: false };
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function moveDrag(event: PointerEvent<HTMLButtonElement>) {
  const session = dragSession.current;
  if (!session || locked) return;
  if (!session.active && Math.hypot(event.clientX - session.x, event.clientY - session.y) < 6) return;
  session.active = true; event.preventDefault(); setDragged(session.card); setSelected(null);
  setDragPoint({ x: event.clientX, y: event.clientY }); setDropTarget(targetAt(event.clientX, event.clientY));
 }
 function place(slot: number, card = selected) {
  if (!room || player === "spectator" || locked) return;
  if (card && !canPlaceOnTable(room, player, slot, card)) return;
  cancelDrag(); setSelected(null); void onAction({ type: "place", slot, card });
 }
 function finishDrag(event: PointerEvent<HTMLButtonElement>) {
  const session = dragSession.current;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  if (session?.active) {
   ignoreClickUntil.current = event.timeStamp + 250;
   const target = targetAt(event.clientX, event.clientY);
   if (target !== null && !locked && hand.includes(session.card) && !room?.ownSlots.includes(session.card)) place(target, session.card);
  }
  cancelDrag();
 }
 return <main className={"mockup duel-table" + (reducedMotion ? " motion-reduced" : "")} aria-label="Sala compartilhada">
  <header className="mock-header">
   <div className="mock-brand"><span className="mock-logo" aria-hidden="true" /><span>Kron Card Game</span></div>
   <div className="mock-experiment"><span />{player === "spectator" ? "ESPECTADOR" : `PLAYER ${player}`}<small role="status">{status}</small></div>
   <nav aria-label="Controles da mesa"><button className="mock-quiet" aria-pressed={three} onClick={() => setThree(!three)}>Mesa 3D {three ? "ativa" : "desativada"}</button><button className="mock-quiet" aria-pressed={!reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}>Animações {reducedMotion ? "off" : "on"}</button><button className="mock-quiet" onClick={onLeave}><ArrowLeft size={15} /> Sair</button></nav>
  </header>
  {error && <p className="error duel-error" role="alert">{error}</p>}
  {!room ? <p role="status">Conectando à sala…</p> : <>
   <div className="mock-match-label"><span>{classNameFor(room.decks[bottom])}<i>×</i>{classNameFor(room.decks[top])}</span><span>Partida {room.match} · Sala compartilhada</span></div>
   <div className="mock-layout">
    <aside className="mock-side mock-left">
     <div className="mock-round"><span>RODADA</span><strong>{String(room.round).padStart(2, "0")}</strong><small>5 slots · ações simultâneas</small></div>
     <div className="mock-fatigue" aria-label="Cartas em fadiga"><h2>Em fadiga</h2>{room.fatigue.map(side => <div className={"mock-fatigue-side deck-" + room.decks[side.player]} key={side.player}><h3>Player {side.player}</h3>{side.cards.length ? side.cards.map(entry => {
      const definition = definitionFor(side.player, entry.card)!;
      return <CardZoom key={entry.card} side={side.player} deck={definition.classId} value={<CardText card={definition} />} previewValue={<FramedCard card={definition} />} caption="Em fadiga" variant="framed" focusable><div className="duel-fatigue-entry"><span>{classNameFor(definition.classId)} {definition.number} · {definition.text.main.join(" · ")}</span><small>Restam {entry.remainingRounds} · volta R{entry.availableRound}</small></div></CardZoom>;
     }) : <small>Nenhuma carta</small>}</div>)}</div>
    </aside>
    <div className="mock-arena">
     <div className="mock-opponent"><DuelHero side={top} room={room} player={player} /></div>
     <div className="mock-board-scroll" role="region" aria-label="Mesa de batalha" tabIndex={0}>
      <div className="mock-board">
       <TableScene occupied={[top, bottom].map(side => room.fields.find(field => field.player === side)!.slots.map((card, slot) => !!card || !!room.creatures[side as Player][slot]))} colors={[deckTableColors[room.decks[top]], deckTableColors[room.decks[bottom]]]} activeSlot={activeSlot} enabled={three} reducedMotion={reducedMotion} />
       <div className="mock-slots">{([top, bottom]).map(side => <div className={"mock-row deck-" + room.decks[side]} role="group" aria-label={"Campo do Player " + side} key={side}>
        {Array.from({ length: 5 }, (_, slot) => {
         const { card, definition, creature } = tableSlot(room, side, slot);
         const mine = side === player;
         const occupied = !!card || !!creature;
         const canDrop = mine && !locked && !!candidate && canPlaceOnTable(room, side, slot, candidate);
         const pinned = vision?.round === room.round && vision.slot === slot;
         const disabled = !mine || locked || pinned || (candidate ? !canDrop : !room.ownSlots[slot]);
         const content = creature ? <><CreatureText creature={creature} />{room.revealed && definition?.fortify && <span className="creature-overlay">{definition.text.main.join(" · ")}</span>}</> : definition ? <CardText card={definition} /> : card ? <span className="mock-card-back" aria-hidden="true" /> : <span className="mock-empty"><span>+</span><small>{candidate && mine ? "Colocar aqui" : "Slot livre"}</small></span>;
         const preview = creature ? <><CreatureText creature={creature} />{definition?.fortify && <CardText card={definition} detailed />}</> : definition ? <FramedCard card={definition} /> : content;
         const label = `Player ${side}, slot ${slot + 1}` + (creature ? `, ${creature.kind === "wolf" ? "Lobo" : "Urso"}, vida ${creature.life}/${creature.maxLife}` : definition ? ", " + cardDescription(definition) : card ? ", carta virada" : ", vazio");
         const inner = <><span className="mock-slot-id">0{slot + 1}</span>{content}{room.bleeding[side][slot] > 0 && <span className="duel-bleeding">Sangramento {room.bleeding[side][slot]} · R{room.bleedingRound}</span>}</>;
         const slotClass = "mock-slot" + (occupied ? " occupied" : "") + (definition || creature ? " turned" : "") + (creature ? " duel-creature" : "") + (activeSlot === slot ? " resolving" : "") + (canDrop ? " targetable" : "") + (mine && dropTarget === slot ? " drag-over" : "");
         return <CardZoom key={slot} side={side} deck={room.decks[side]} value={content} previewValue={preview} caption={`Player ${side} · Slot ${slot + 1}`} enabled={occupied} hiddenCard={card === "hidden" && !creature} focusable={disabled} variant={creature ? "standard" : "framed"} suppressPreview={!!dragged}>
          {mine ? <button className={slotClass} disabled={disabled} aria-label={label} data-drop-slot={slot} onClick={() => place(slot)}>{inner}</button> : <div className={slotClass} aria-label={label}>{inner}</div>}
         </CardZoom>;
        })}
       </div>)}</div>
       <div className="mock-table-divider" aria-hidden="true"><span /><b>◆</b><span /></div>
      </div>
     </div>
     <div className="mock-you"><DuelHero side={bottom} room={room} player={player} /><div className="mock-preparation"><span>{room.revealed ? "CARTAS REVELADAS" : player === "spectator" ? "PREPARAÇÃO" : own?.ready ? "AGUARDANDO OPONENTE" : "PREPARAÇÃO"}</span>{player !== "spectator" && <><strong>{filled}<small>/5 slots</small></strong><div>{Array.from({ length: 5 }, (_, i) => <i className={i < filled ? "filled" : ""} key={i} />)}</div></>}</div></div>
    </div>
    <aside className="mock-side mock-right">
     <RoundTimer room={room} />
     {player !== "spectator" && <div className="mock-round-control">{room.revealed ? <button className="mock-ready" disabled={busy || activeSlot >= 0 || (!room.result && room.nextRoundReady[player])} onClick={() => onAction({ type: room.result ? "restart" : "reset" })}>{room.result ? "Nova partida" : room.nextRoundReady[player] ? "Confirmado ✓" : "Nova rodada"}<ChevronRight size={17} /></button> : <button className="mock-ready" disabled={!canAttemptReady} onClick={() => { if (missing.length) { setWarningVersion(value => value + 1); return; } void onAction({ type: "ready" }); }}>{own?.ready ? "Pronto ✓" : "Pronto"}<Check size={17} /></button>}</div>}
     <p key={roundKey + warningVersion} className={"duel-phase" + (missing.length && warningVersion > 0 ? " mandatory-warning" : "")} role="status">{room.result ? room.result.type === "draw" ? "Empate!" : `Player ${room.result.winner} venceu!` : room.revealed ? room.nextRoundReady[1] || room.nextRoundReady[2] ? `Aguardando Player ${room.nextRoundReady[1] ? 2 : 1} confirmar Nova rodada.` : room.timedOut ? "Tempo esgotado. Slots vazios não agiram." : "Confrontos resolvidos." : player === "spectator" ? "Aguardando os jogadores." : own?.ready ? "Aguardando o oponente…" : waitingForVision || needsForetell ? "Resolva a Premonição abaixo." : room.preparationStartedAt === null ? "Aguardando o outro jogador escolher o baralho." : missing.length ? `Faltam ${missing.length} cartas Não age.` : "Prepare seus slots."}</p>
     <div className="mock-log"><h2>Confrontos</h2>{!room.revealed ? <p>O registro aparece após a revelação.</p> : <ol>{room.battle.map(item => <li key={item.slot}><b>0{item.slot}</b><span>P{bottom} <strong className={item.damageTaken[bottom] ? "hit" : ""}>−{item.damageTaken[bottom]}</strong><small>P{top} <strong className={item.damageTaken[top] ? "hit" : ""}>−{item.damageTaken[top]}</strong></small></span>{item.damageTaken[1] + item.damageTaken[2] === 0 ? <Shield size={13} /> : <Swords size={13} />}</li>)}</ol>}</div>
    </aside>
   </div>
   {player !== "spectator" && !room.revealed && <div className={"mock-hand-area deck-" + room.decks[player]} aria-label="Sua mão">
    <div className="mock-hand-heading"><h2>Sua mão <span>{hand.filter(card => !room.ownSlots.includes(card) && !isSummonActive(room, player, card)).length} disponíveis</span></h2><p>{room.noActionOptional[player] ? "Fúria ativa · Não age opcionais" : ""}</p></div>
    <div className="mock-hand-scroll"><div className="mock-hand" style={{ "--hand-count": hand.length } as CSSProperties}>{hand.map((card, index) => {
     const definition = definitionFor(player, card)!;
     const slot = room.ownSlots.indexOf(card);
     const unavailable = locked || slot !== -1 || isSummonActive(room, player, card) || (!!definition.fortify && !room.creatures[player].some(Boolean));
     const offset = index - (hand.length - 1) / 2;
     return <div className={"mock-hand-position" + (selected === card ? " is-selected" : "") + (slot !== -1 ? " is-used" : "")} style={{ "--angle": offset * 2 + "deg", "--arc": offset * offset + "px", "--order": index } as CSSProperties} key={card}>
      <CardZoom side={player} deck={definition.classId} value={<CardText card={definition} />} previewValue={<FramedCard card={definition} />} caption="Sua mão" focusable={unavailable} variant="framed" suppressPreview={!!dragged}>
       <button className={"mock-hand-card" + (dragged === card ? " dragging" : "")} disabled={unavailable} draggable={false} onPointerDown={event => beginDrag(event, card, unavailable)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} aria-label={cardDescription(definition) + (slot !== -1 ? ", no slot " + (slot + 1) : "")} aria-pressed={selected === card} onClick={event => { if (event.timeStamp >= ignoreClickUntil.current) setSelected(selected === card ? null : card); }}><span className="mock-hand-symbol"><ClassSymbol deck={definition.classId} size={22} /></span><CardText card={definition} /><span className="mock-hand-tag">{slot !== -1 ? `SLOT ${slot + 1}` : isSummonActive(room, player, card) ? "NO CAMPO" : required.includes(card) ? "OBRIGATÓRIA" : isMandatoryCard(definition) ? "NÃO AGE" : definition.fatigue ? `FADIGA ${definition.fatigue.rounds}` : "AÇÃO"}</span></button>
      </CardZoom>
     </div>;
    })}</div></div>
   </div>}
   {player !== "spectator" && !room.revealed && <div className={"duel-controls deck-" + room.decks[player]}>
    <PremonitionPanel room={room} player={player} busy={busy} onChoose={slot => onAction({ type: "foretell", slot })} />
    <AttackTargetPanel room={room} player={player} locked={locked} onTarget={(slot, target) => onAction({ type: "attack_target", slot, target })} />
    <ResourcePanel room={room} player={player} />
    <FloatingPanel room={room} player={player} locked={locked} onAim={(card, targets) => onAction({ type: "aim", card, targets })} />
    <HolyPowerPanel room={room} player={player} locked={locked} onSave={(card, amount) => onAction({ type: "holy_spend", card, amount })} />
   </div>}
   {room.revealed && <details className="duel-details"><summary>Detalhes da rodada</summary><BattleSummary room={room} /><FloatingSummary room={room} /></details>}
   {dragged && dragPoint && player !== "spectator" && createPortal(<div className={"mock-drag-ghost deck-" + room.decks[player]} aria-hidden="true" style={{ left: dragPoint.x + 16, top: dragPoint.y - 50 }}><CardText card={definitionFor(player, dragged)!} /></div>, document.body)}
  </>}
  <footer className="mock-footer"><span>MESA MULTIPLAYER · {player === "spectator" ? "ESPECTADOR" : `PLAYER ${player}`}</span><span>Preparação oculta · revelação simultânea</span></footer>
 </main>;
}
