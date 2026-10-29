"use client";
import { useEffect, useState } from "react";
import type { RoomView } from "../lib/game";

export function RoundTimer({ room }: { room: RoomView }) {
 const { preparationStartedAt: startedAt, preparationDuration: duration, serverNow, revealed } = room;
 const [seconds, setSeconds] = useState(Math.ceil(duration / 1000));
 useEffect(() => {
  const received = performance.now();
  const sync = () => setSeconds(revealed ? 0 : startedAt === null ? Math.ceil(duration / 1000) : Math.max(0, Math.ceil((startedAt + duration - serverNow - (performance.now() - received)) / 1000)));
  const frame = requestAnimationFrame(sync);
  const timer = window.setInterval(sync, 200);
  return () => { cancelAnimationFrame(frame); clearInterval(timer); };
 }, [startedAt, duration, serverNow, revealed]);
 const waiting = startedAt === null && !revealed;
 const progress = revealed ? 0 : Math.min(1, seconds / (duration / 1000));
 return <div className={"duel-timer" + (seconds <= 10 && !waiting && !revealed ? " timer-urgent" : "")} role="timer" aria-label={waiting ? "Timer aguardando preparação" : revealed ? "Preparação encerrada" : `Preparação: ${seconds} segundos restantes`}>
  <svg viewBox="0 0 80 80" aria-hidden="true"><circle className="timer-track" cx="40" cy="40" r="34" /><circle className="timer-progress" cx="40" cy="40" r="34" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress * 100} /></svg>
  <span><strong>{waiting ? "70" : seconds}</strong><small>SEGUNDOS</small></span>
  <p>{revealed ? "Preparação encerrada" : waiting ? "Aguardando jogadores / Premonição" : "Tempo de preparação"}</p>
 </div>;
}
