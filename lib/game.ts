export type Player = 1 | 2;
export type Slots = (string | null)[];
export type GameState = { round: number; slots: Record<Player, Slots>; ready: Record<Player, boolean> };
export type GameAction = { type: "place"; slot: number; card: string | null } | { type: "ready" } | { type: "reset" };
export type FieldView = { player: Player; slots: (string | null)[]; ready: boolean };
export type RoomView = { version: number; round: number; revealed: boolean; ownSlots: Slots; fields: FieldView[] };
export const cardsFor = (player: Player) => player === 1 ? Array.from({ length: 10 }, (_, i) => String(i + 1)) : Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i));
export const newGame = (round = 1): GameState => ({ round, slots: { 1: Array(5).fill(null), 2: Array(5).fill(null) }, ready: { 1: false, 2: false } });
export const isRevealed = (state: GameState) => state.ready[1] && state.ready[2];

export function applyAction(state: GameState, player: Player, action: GameAction): GameState {
 if (action.type === "reset") {
  if (!isRevealed(state)) throw new Error("A rodada ainda não terminou.");
  return newGame(state.round + 1);
 }
 if (state.ready[player]) throw new Error("Você já está pronto. Aguarde o outro jogador.");
 const next = structuredClone(state);
 if (action.type === "ready") {
  if (state.slots[player].filter(Boolean).length !== 5) throw new Error("Preencha os 5 slots antes de ficar pronto.");
  next.ready[player] = true;
 } else if (action.type === "place") {
  if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot > 4) throw new Error("Slot inválido.");
  if (action.card !== null && !cardsFor(player).includes(action.card)) throw new Error("Esta carta não pertence à sua mão.");
  if (action.card !== null && state.slots[player].some((card, index) => card === action.card && index !== action.slot)) throw new Error("Esta carta já ocupa outro slot.");
  next.slots[player][action.slot] = action.card;
 } else { throw new Error("Ação inválida."); }
 return next;
}

export function roomView(state: GameState, player: Player, version: number): RoomView {
 const revealed = isRevealed(state);
 return {
  version, round: state.round, revealed, ownSlots: state.slots[player],
  fields: ([1, 2] as Player[]).map(side => ({
   player: side, ready: state.ready[side],
   slots: state.slots[side].map(card => card === null ? null : revealed ? card : "hidden"),
  })),
 };
}
