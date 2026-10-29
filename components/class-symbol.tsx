import { Axe, BowArrow, Crosshair, HandFist, PawPrint, Shield, ShieldPlus, Sword, Swords, WandSparkles } from "lucide-react";
import type { DeckId } from "../lib/cards";

// Approved for the mockup; visual identity can still be refined later.
export const classSymbols = {
 warrior: { icon: Swords, label: "Espadas cruzadas" },
 monk: { icon: HandFist, label: "Punho fechado" },
 rogue: { icon: Sword, label: "Lâmina" },
 paladin: { icon: ShieldPlus, label: "Escudo com cruz" },
 gunner: { icon: Crosshair, label: "Mira" },
 ranger: { icon: BowArrow, label: "Arco e flecha" },
 guardian: { icon: Shield, label: "Escudo" },
 mage: { icon: WandSparkles, label: "Varinha arcana" },
 barbarian: { icon: Axe, label: "Machado" },
 summoner: { icon: PawPrint, label: "Pata" },
} as const;

export function ClassSymbol({ deck, size = 32 }: { deck: DeckId; size?: number }) {
 const Icon = classSymbols[deck].icon;
 return <Icon size={size} strokeWidth={1.3} aria-hidden="true" />;
}
