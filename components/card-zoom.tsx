"use client";

import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { Player } from "../lib/game";

export function CardZoom({ children, side, value, caption, enabled = true, hiddenCard = false, focusable = false }: {
 children: ReactNode; side: Player; value: string; caption: string; enabled?: boolean; hiddenCard?: boolean; focusable?: boolean;
}) {
 const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
 function show(event: SyntheticEvent<HTMLDivElement>) {
  if (!enabled || (event.type === "mouseenter" && !window.matchMedia("(hover: hover)").matches)) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const width = 176, height = 264, gap = 16, margin = 12;
  const preferredLeft = bounds.right + gap + width <= window.innerWidth - margin ? bounds.right + gap : bounds.left - gap - width;
  setPosition({
   left: Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin)),
   top: Math.max(margin, Math.min(bounds.top + bounds.height / 2 - height / 2, window.innerHeight - height - margin)),
  });
 }
 useEffect(() => {
  if (!position) return;
  const close = () => setPosition(null);
  const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", close);
  window.addEventListener("scroll", close, true);
  return () => {
   window.removeEventListener("keydown", onKey);
   window.removeEventListener("resize", close);
   window.removeEventListener("scroll", close, true);
  };
 }, [position]);
 return <div className="card-zoom" tabIndex={enabled && focusable ? 0 : undefined} onMouseEnter={show} onMouseLeave={() => setPosition(null)} onFocusCapture={show} onBlurCapture={() => setPosition(null)}>
  {children}
  {enabled && position && createPortal(<div aria-hidden="true" className={"card-preview player-" + side + (hiddenCard ? " preview-hidden" : "")} style={position}>
   <span className="preview-caption">{caption}</span>
   <span className="preview-value">{value}</span>
  </div>, document.body)}
 </div>;
}
