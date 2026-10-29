import { definitionFor } from "./cards.ts";
import { isSummonActive, type RoomView, type Player, type Viewer } from "./game.ts";

export const deckTableColors = {
 warrior: 0xbd9272, monk: 0x00ff98, rogue: 0xd4cb80, paladin: 0xd39bd2,
 gunner: 0x70abaa, ranger: 0xabc579, guardian: 0x80afca, mage: 0x8dd2ed,
 barbarian: 0xd68e7b, summoner: 0x5d9e80,
} as const;

export function tableSides(viewer: Viewer): [Player, Player] {
 return viewer === 2 ? [1, 2] : [2, 1];
}

// Only use the server's public fields to build faces. ownSlots is for editing,
// never for revealing a prepared card before the other player is ready.
export function tableSlot(room: RoomView, side: Player, slot: number) {
 const card = room.fields.find(field => field.player === side)!.slots[slot];
 return { card, definition: card && card !== "hidden" ? definitionFor(side, card) : undefined, creature: room.creatures[side][slot] };
}

export function canPlaceOnTable(room: RoomView, player: Player, slot: number, card: string) {
 const definition = definitionFor(player, card);
 if (!definition || room.revealed || room.result || room.fields.find(field => field.player === player)?.ready) return false;
 const vision = room.visions[player === 1 ? 2 : 1];
 if (vision?.round === room.round && (vision.slot === null || vision.slot === slot)) return false;
 if (room.fatigue.find(side => side.player === player)?.cards.some(entry => entry.card === card)) return false;
 if (isSummonActive(room, player, card)) return false;
 return definition.fortify ? !!room.creatures[player][slot] : !room.creatures[player][slot];
}
