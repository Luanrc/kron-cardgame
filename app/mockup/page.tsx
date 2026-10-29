"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Heart, RotateCcw, Shield, Sparkles, Swords, VolumeX } from "lucide-react";
import { TableScene } from "../../components/table-scene";
import { CardText } from "../../components/card-text";
import { CardZoom } from "../../components/card-zoom";
import { FatiguePanel } from "../../components/fatigue-panel";
import { applyAction, availableCardsFor, isRevealed, missingRequiredCards, roomView, type GameState, type Player } from "../../lib/game";
import { cardDescription, classNameFor, definitionFor, isMandatoryCard } from "../../lib/cards";
import { createMockupGame, fillMockupField, prepareOpponent } from "../../lib/mockup";
import "./mockup.css";

export default function Mockup() {
 const [game, setGame] = useState<GameState>(createMockupGame);
 const [selected, setSelected] = useState<string | null>(null);
 const [step, setStep] = useState(-1);
 const [three, setThree] = useState(true);
 const [reducedMotion, setReducedMotion] = useState(false);
 const [error, setError] = useState("");
 const revealed = isRevealed(game);
 const resolving = revealed && step < game.battle.length;
 const room = roomView(game, 1, 1);
 const hand = availableCardsFor(game, 1);
 const filled = game.slots[1].filter(Boolean).length;
 const missing = missingRequiredCards(game, 1);
 const canReady = filled === 5 && missing.length === 0 && !revealed;
 const visibleLife = step >= game.battle.length && revealed ? game.life : step > 0 ? game.battle[step - 1].lifeAfter : { 1: 10, 2: 10 };
 // Preserve life between rounds while revealing this round's result one pair at a time.
 const beforeLife = revealed ? { 1: (game.battle[0]?.lifeAfter[1] ?? game.life[1]) + (game.battle[0]?.damageTaken[1] ?? 0), 2: (game.battle[0]?.lifeAfter[2] ?? game.life[2]) + (game.battle[0]?.damageTaken[2] ?? 0) } : game.life;
 const life = revealed && step === 0 ? beforeLife : revealed ? visibleLife : game.life;
 useEffect(() => {
  if (!resolving) return;
  const timer = window.setTimeout(() => setStep(value => value + 1), reducedMotion ? 80 : 750);
  return () => window.clearTimeout(timer);
 }, [step, resolving, reducedMotion]);
 useEffect(() => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  setReducedMotion(preference.matches);
 }, []);
 function place(slot: number) {
  try { setGame(applyAction(game, 1, { type: "place", slot, card: selected })); setSelected(null); setError(""); }
  catch (issue) { setError(issue instanceof Error ? issue.message : "Não foi possível colocar a carta."); }
 }
 function ready() {
  try { setGame(applyAction(game, 1, { type: "ready" })); setSelected(null); setStep(0); setError(""); }
  catch (issue) { setError(issue instanceof Error ? issue.message : "Confira seu campo."); }
 }
 function next() {
  setGame(game.result ? createMockupGame() : prepareOpponent(applyAction(game, 1, { type: "reset" })));
  setStep(-1); setSelected(null); setError("");
 }
 const phase = resolving ? "Resolvendo slot " + (step + 1) : revealed ? game.result ? "Fim da partida" : "Rodada resolvida" : selected ? "Escolha o slot de destino" : "Prepare sua rodada";
 function Hero({ side }: { side: Player }) {
  const damage = step > 0 ? game.battle[step - 1]?.damageTaken[side] ?? 0 : 0;
  return <div className={"mock-hero deck-" + game.decks[side]} aria-label={"Player " + side + ", " + life[side] + " de vida"}>
   <div className="mock-hero-icon">{side === 1 ? <Swords size={27} strokeWidth={1.3} /> : <Sparkles size={27} strokeWidth={1.3} />}</div>
   <div><span>{side === 1 ? "VOCÊ · PLAYER 1" : "OPONENTE DE TESTE"}</span><strong>{classNameFor(game.decks[side])}</strong></div>
   <div className="mock-health" key={game.round + "-" + step}><Heart size={14} fill="currentColor" /><b>{life[side]}</b><small>/ 10</small>{damage > 0 && <i className="mock-damage">−{damage}</i>}</div>
  </div>;
 }
 return <main className={"mockup" + (reducedMotion ? " motion-reduced" : "")}>
  <header className="mock-header">
   <a href="/" className="mock-brand"><span className="mock-logo">K</span><span>KRON<small>CARD GAME</small></span></a>
   <div className="mock-experiment"><span /> MESA EXPERIMENTAL <small>01</small></div>
   <nav aria-label="Controles do mockup"><button className="mock-quiet" aria-pressed={three} onClick={() => setThree(!three)}>Mesa 3D {three ? "ativa" : "desativada"}</button><button className="mock-quiet mock-motion" aria-pressed={!reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}>Animações {reducedMotion ? "off" : "on"}</button><a href="/" aria-label="Voltar ao jogo"><ArrowLeft size={18} /></a></nav>
  </header>
  <div className="mock-match-label"><span>GUERREIRO <i>×</i> MONGE</span><span>Simulação local · sem conexão com a sala online</span></div>
  <div className="mock-layout">
   <aside className="mock-side mock-left">
    <div className="mock-round"><span>RODADA</span><strong>{String(game.round).padStart(2, "0")}</strong><small>5 slots · ações simultâneas</small></div>
    <div className="mock-fatigue"><h2>Em fadiga</h2><p>Retornam nas próximas rodadas.</p>{room.fatigue.map(side => <div className={"mock-fatigue-side deck-" + game.decks[side.player]} key={side.player}><h3>{side.player === 1 ? "Você" : "Oponente"}</h3>{side.cards.length ? side.cards.map(entry => <div key={entry.card}><span>{definitionFor(side.player, entry.card)!.text.main.join(" · ")}</span><small>Volta na rodada {entry.availableRound}</small></div>) : <small>Nenhuma carta</small>}</div>)}</div>
   </aside>
   <div className="mock-arena">
    <div className="mock-opponent"><div className="mock-mini-hand" aria-label="Mão oculta do oponente">{Array.from({ length: 5 }, (_, i) => <span key={i} style={{ "--mini-angle": (i - 2) * 7 + "deg" } as CSSProperties}>K</span>)}</div><Hero side={2} /></div>
    <div className="mock-board-scroll" role="region" aria-label="Mesa de batalha" tabIndex={0}>
     <div className="mock-board">
      <TableScene occupied={[game.slots[2].map(Boolean), game.slots[1].map(Boolean)]} activeSlot={resolving ? step : -1} enabled={three} reducedMotion={reducedMotion} />
      <div className="mock-slots">{([2, 1] as const).map(side => <div className={"mock-row deck-" + game.decks[side]} role="group" aria-label={side === 1 ? "Seus slots" : "Slots do oponente"} key={side}>
       {game.slots[side].map((card, slot) => {
        const visible = revealed && (!resolving || slot <= step);
        const definition = card ? definitionFor(side, card)! : null;
        const content = visible && definition ? <CardText card={definition} /> : card ? <span className="mock-card-back"><span>K</span><small>{side === 1 ? "Sua carta" : "Oculta"}</small></span> : <span className="mock-empty"><span>+</span><small>{selected ? "Colocar aqui" : "Slot livre"}</small></span>;
        return <CardZoom key={slot} side={side} deck={game.decks[side]} value={content} previewValue={visible && definition ? <CardText card={definition} detailed /> : content} caption={"Slot " + (slot + 1)} enabled={!!card} hiddenCard={!visible} focusable={side === 2}>
         <button disabled={side === 2 || revealed || (!selected && !card)} className={"mock-slot" + (card ? " occupied" : "") + (visible ? " turned" : "") + (step === slot && resolving ? " resolving" : "") + (selected && side === 1 ? " targetable" : "")} aria-label={(side === 1 ? "Seu slot " : "Slot do oponente ") + (slot + 1) + (visible && definition ? ": " + cardDescription(definition) : card ? ": carta oculta" : ": vazio")} onClick={() => place(slot)}><span className="mock-slot-id">0{slot + 1}</span>{content}</button>
        </CardZoom>;
       })}
      </div>)}</div>
      <div className="mock-table-divider" aria-hidden="true"><span /> <b>◆</b> <span /></div>
     </div>
    </div>
    <div className="mock-you"><Hero side={1} /><div className="mock-preparation"><span>{revealed ? "CARTAS REVELADAS" : "PREPARAÇÃO"}</span><strong>{filled}<small>/5 slots</small></strong><div>{Array.from({ length: 5 }, (_, i) => <i className={i < filled ? "filled" : ""} key={i} />)}</div></div></div>
   </div>
   <aside className="mock-side mock-right">
    <div className="mock-round-control"><span className="mock-eyebrow">{resolving ? "CONFRONTO" : "SUA RODADA"}</span><h2 aria-live="polite">{phase}</h2><p>{revealed ? resolving ? "As cartas são comparadas, slot a slot." : "Confira os resultados e siga para a próxima rodada." : "Escolha uma carta na mão e depois um slot no campo."}</p>
     {revealed ? <button className="mock-ready" disabled={resolving} onClick={next}>{game.result ? "Nova partida" : "Nova rodada"}<ChevronRight size={17} /></button> : <button className="mock-ready" disabled={!canReady} onClick={ready}>Pronto <Check size={17} /></button>}
     {!revealed && <small>{missing.length ? missing.length + " cartas Não age ainda obrigatórias" : filled < 5 ? "Preencha os slots restantes" : "Tudo pronto para revelar"}</small>}
     {!revealed && <button className="mock-autofill" onClick={() => { setGame(fillMockupField(game)); setSelected(null); }}>Preencher exemplo <ArrowRight size={13} /></button>}
    </div>
    <div className="mock-log"><h2>Confrontos</h2>{!revealed ? <p>O registro aparece após a revelação.</p> : <ol>{game.battle.slice(0, step).map(item => <li key={item.slot}><b>0{item.slot}</b><span>Você <strong className={item.damageTaken[1] ? "hit" : ""}>−{item.damageTaken[1]}</strong><small>Oponente <strong className={item.damageTaken[2] ? "hit" : ""}>−{item.damageTaken[2]}</strong></small></span>{item.damageTaken[1] + item.damageTaken[2] === 0 ? <Shield size={13} /> : <Swords size={13} />}</li>)}</ol>}</div>
    <button className="mock-reset" onClick={() => { setGame(createMockupGame()); setStep(-1); setSelected(null); setError(""); }}><RotateCcw size={13} /> Reiniciar teste</button>
   </aside>
  </div>
  <div className="mock-hand-area deck-warrior">
   <div className="mock-hand-heading"><h2>Sua mão <span>{hand.filter(card => !game.slots[1].includes(card)).length} disponíveis</span></h2><p role="status">{error || (game.result && !resolving ? game.result.type === "draw" ? "Empate!" : game.result.winner === 1 ? "Você venceu!" : "O Monge venceu." : selected ? "Carta selecionada. Escolha um dos seus cinco slots." : revealed ? "Passe o mouse para inspecionar as cartas." : "Clique para selecionar · passe o mouse para ampliar")}</p></div>
   <div className="mock-hand-scroll"><div className="mock-hand" style={{ "--hand-count": hand.length } as CSSProperties}>{hand.map((card, index) => {
    const definition = definitionFor(1, card)!;
    const slot = game.slots[1].indexOf(card);
    const used = slot !== -1;
    const offset = index - (hand.length - 1) / 2;
    return <div className={"mock-hand-position" + (selected === card ? " is-selected" : "") + (used ? " is-used" : "")} style={{ "--angle": offset * 2.4 + "deg", "--arc": offset * offset * 1.4 + "px", "--order": index } as CSSProperties} key={card}>
     <CardZoom side={1} deck="warrior" value={<CardText card={definition} />} previewValue={<CardText card={definition} detailed />} caption="Sua mão" focusable={used || revealed}>
      <button className="mock-hand-card" disabled={used || revealed} aria-label={cardDescription(definition) + (used ? ", no slot " + (slot + 1) : "")} aria-pressed={selected === card} onClick={() => setSelected(selected === card ? null : card)}><span className="mock-hand-symbol">{isMandatoryCard(definition) ? "—" : definition.effects.some(effect => effect.kind === "defense") ? <Shield size={22} strokeWidth={1.2} /> : <Swords size={22} strokeWidth={1.2} />}</span><CardText card={definition} /><span className="mock-hand-tag">{used ? "SLOT " + (slot + 1) : isMandatoryCard(definition) ? "OBRIGATÓRIA" : definition.fatigue ? "FADIGA " + definition.fatigue.rounds : "AÇÃO"}</span></button>
     </CardZoom>
    </div>;
   })}</div></div>
  </div>
  <details className="mock-mobile-fatigue"><summary>Fadiga dos jogadores</summary><FatiguePanel fatigue={room.fatigue} /></details>
  <footer className="mock-footer"><span>MOCKUP INTERATIVO · GUERREIRO × MONGE</span><span><VolumeX size={12} /> Sem áudio nesta versão</span></footer>
 </main>;
}
