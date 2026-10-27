"use client";
import { useEffect, useState } from "react";
import { definitionFor } from "../lib/cards";
import { holyEffectValue, potentialHolyPower } from "../lib/holy-power";
import type { Player, RoomView } from "../lib/game";

function SpendingControl({ card, number, maximum, value, locked, onSave }: { card: string; number: number; maximum: number; value: number; locked: boolean; onSave: (card: string, amount: number) => void }) {
 const [draft, setDraft] = useState(String(value));
 useEffect(() => setDraft(String(value)), [value]);
 const amount = Number(draft);
 const valid = draft !== "" && Number.isSafeInteger(amount) && amount >= 0 && amount <= maximum;
 return <form onSubmit={event => { event.preventDefault(); if (valid) onSave(card, amount); }}>
  <label>Paladino {number} · Poder Sagrado a gastar
   <input aria-label={"Carta " + number + " · Poder Sagrado a gastar"} type="number" min={0} max={maximum} step={1} value={draft} disabled={locked} onChange={event => setDraft(event.target.value)} />
  </label>
  <p className="hint">Máximo possível antes desta carta: {maximum}. {valid ? "X = " + holyEffectValue(amount) + "." : "Escolha um valor inteiro entre 0 e " + maximum + "."} Gasto salvo: {value}.</p>
  <button className="secondary" type="submit" disabled={locked || !valid || amount === value}>Salvar gasto</button>
 </form>;
}

export function HolyPowerPanel({ room, player, locked, onSave }: { room: RoomView; player: Player; locked: boolean; onSave: (card: string, amount: number) => void }) {
 const cards = room.ownSlots.flatMap(card => card && definitionFor(player, card)?.holyPower?.scaling ? [card] : []);
 if (!cards.length) return null;
 return <div className="holy-panel" aria-label="Escolher gasto de Poder Sagrado">
  <h3>Poder Sagrado</h3>
  <p className="hint">Saldo: {room.holyPower[player]}. Ganhos dos slots anteriores dependem do êxito das ações. Se o saldo real for menor, o gasto será limitado a ele. Sua escolha fica oculta até a revelação.</p>
  {cards.map(card => room.fields.find(field => field.player === player)?.ready ? <p key={card}>Gasto programado: {room.holySpending[player][card] ?? 0} · X previsto: {holyEffectValue(room.holySpending[player][card] ?? 0)}.</p> : <SpendingControl key={room.match + "-" + room.round + "-" + card} card={card} number={definitionFor(player, card)!.number} maximum={potentialHolyPower(player, room.ownSlots, card, room.holyPower[player])} value={room.holySpending[player][card] ?? 0} locked={locked} onSave={onSave} />)}
 </div>;
}
