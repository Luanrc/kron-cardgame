"use client";

import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { Player } from "../lib/game";
import type { DeckId } from "../lib/cards";

export function CardZoom({ children, side, deck, value, previewValue, caption, enabled = true, hiddenCard = false, focusable = false, variant = "standard", suppressPreview = false }: {
 children: ReactNode; side: Player; deck?: DeckId; value: ReactNode; previewValue?: ReactNode; caption: string; enabled?: boolean; hiddenCard?: boolean; focusable?: boolean; variant?: "standard" | "framed"; suppressPreview?: boolean;
}) {
 const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
 function show(event: SyntheticEvent<HTMLDivElement>) {
  if (!enabled || suppressPreview || (event.type === "mouseenter" && !window.matchMedia("(hover: hover)").matches)) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const width = variant === "framed" ? 300 : 260, height = variant === "framed" ? 500 : 390, gap = 16, margin = 12;
  const preferredLeft = bounds.right + gap + width <= window.innerWidth - margin ? bounds.right + gap : bounds.left - gap - width;
  setPosition({
   left: Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin)),
   top: Math.max(margin, Math.min(bounds.top + bounds.height / 2 - height / 2, window.innerHeight - height - margin)),
  });
 }
 useEffect(() => { if (suppressPreview) setPosition(null); }, [suppressPreview]);
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
 return <div className={"card-zoom" + (deck ? " deck-" + deck : "")} tabIndex={enabled && focusable ? 0 : undefined} onMouseEnter={show} onMouseLeave={() => setPosition(null)} onDragStartCapture={() => setPosition(null)} onFocusCapture={show} onBlurCapture={() => setPosition(null)}>
  {children}
  {enabled && !suppressPreview && position && createPortal(<div aria-hidden="true" className={"card-preview player-" + side + (deck ? " deck-" + deck : "") + (hiddenCard ? " preview-hidden" : "") + (variant === "framed" ? " preview-framed" : "")} style={position}>
   <span className="preview-caption">{caption}</span>
   <span className="preview-value">{previewValue ?? value}</span>
  </div>, document.body)}
 </div>;
}
