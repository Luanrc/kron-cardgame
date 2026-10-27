import { deckFor, definitionFor, isMandatoryCard, nextAvailableRound, isDeckId, classNameFor, type DeckId } from "./cards.ts";
import { INITIAL_LIFE, resolveBattle, resultFor, type Life, type MatchResult, type SlotResolution } from "./battle.ts";

export type Player = 1 | 2;
export type Viewer = Player | "spectator";
export type Slots = (string | null)[];
export type FatigueEntry = { usedRound: number; availableRound: number };
export type FatigueState = Record<Player, Record<string, FatigueEntry>>;
export type GameState = { decks: Record<Player, DeckId>; match: number; round: number; slots: Record<Player, Slots>; ready: Record<Player, boolean>; fatigue: FatigueState; life: Life; result: MatchResult; battle: SlotResolution[] };
export type GameAction = { type: "select_deck"; deck: DeckId } | { type: "place"; slot: number; card: string | null } | { type: "ready" } | { type: "reset" } | { type: "restart" };
export type FieldView = { player: Player; slots: (string | null)[]; ready: boolean };
export type FatigueView = { player: Player; cards: { card: string; remainingRounds: number; availableRound: number }[] };
export type RoomView = { decks: Record<Player, DeckId>; version: number; match: number; round: number; initialLife: number; life: Life; result: MatchResult; battle: SlotResolution[]; revealed: boolean; ownSlots: Slots; fields: FieldView[]; fatigue: FatigueView[] };
const players: Player[] = [1, 2];
export const cardsFor = (player: Player, deck: DeckId = "warrior") => deckFor(player, deck).map(card => card.instanceId);
export const requiredCardsFor = (player: Player, deck: DeckId = "warrior") => cardsFor(player, deck).filter(card => isMandatoryCard(definitionFor(player, card)!));
export const newGame = (round = 1, match = 1): GameState => ({ decks: { 1: "warrior", 2: "warrior" }, match, round, slots: { 1: Array(5).fill(null), 2: Array(5).fill(null) }, ready: { 1: false, 2: false }, fatigue: { 1: {}, 2: {} }, life: { 1: INITIAL_LIFE, 2: INITIAL_LIFE }, result: null, battle: [] });
export const isRevealed = (state: GameState) => state.ready[1] && state.ready[2];

export function isFatigued(state: GameState, player: Player, card: string) {
 const definition = definitionFor(player, card);
 if (!definition || isMandatoryCard(definition)) return false;
 return (state.fatigue[player][card]?.availableRound ?? 0) > state.round;
}
export const availableCardsFor = (state: GameState, player: Player) => cardsFor(player, state.decks[player]).filter(card => !isFatigued(state, player, card));
export const missingRequiredCards = (state: GameState, player: Player) => requiredCardsFor(player, state.decks[player]).filter(card => !state.slots[player].includes(card));

function registerFatigue(state: GameState) {
 for (const player of players) {
  for (const card of state.slots[player]) {
   if (!card) continue;
   const definition = definitionFor(player, card)!;
   if (isMandatoryCard(definition) || !definition.fatigue?.rounds) continue;
   state.fatigue[player][card] = { usedRound: state.round, availableRound: nextAvailableRound(definition, state.round) };
  }
 }
}
function removeRecoveredCards(state: GameState) {
 for (const player of players) {
  for (const card of Object.keys(state.fatigue[player])) {
   if (!isFatigued(state, player, card)) delete state.fatigue[player][card];
  }
 }
}

// Upgrade saved rounds without erasing the field or requiring a database migration.
export function normalizeGameState(input: Pick<GameState, "round" | "slots" | "ready"> & Partial<Omit<GameState, "round" | "slots" | "ready">>): GameState {
 const legacy = !input.fatigue;
 const life = structuredClone(input.life ?? { 1: INITIAL_LIFE, 2: INITIAL_LIFE });
 const state: GameState = { ...structuredClone(input), decks: structuredClone(input.decks ?? { 1: "warrior", 2: "warrior" }), match: input.match ?? 1, fatigue: structuredClone(input.fatigue ?? { 1: {}, 2: {} }), life, result: input.result ?? resultFor(life), battle: structuredClone(input.battle ?? []) };
 if (legacy) {
  if (isRevealed(state)) registerFatigue(state);
  else for (const player of players) {
   if (state.ready[player] && missingRequiredCards(state, player).length) state.ready[player] = false;
  }
 }
 removeRecoveredCards(state);
 return state;
}

export function applyAction(input: GameState, player: Player, action: GameAction): GameState {
 if (player !== 1 && player !== 2) throw new Error("Espectadores só podem assistir.");
 const state = normalizeGameState(input);
 if (action.type === "select_deck") {
  if (!isDeckId(action.deck)) throw new Error("Baralho inválido.");
  if (state.decks[player] === action.deck) return state;
  if (state.round !== 1 || state.result || state.battle.length || state.ready[player] || state.slots[player].some(Boolean) || players.some(side => state.life[side] !== INITIAL_LIFE)) throw new Error("O baralho só pode ser trocado no início da partida, antes de colocar suas cartas. Para continuar, selecione " + classNameFor(state.decks[player]) + ".");
  state.decks[player] = action.deck;
  return state;
 }
 if (action.type === "restart") {
  if (!state.result) throw new Error("A partida ainda não terminou.");
  return { ...newGame(1, state.match + 1), decks: structuredClone(state.decks) };
 }
 if (state.result) throw new Error("A partida terminou. Inicie uma nova partida.");
 if (action.type === "reset") {
  if (!isRevealed(state)) throw new Error("A rodada ainda não terminou.");
  const next = newGame(state.round + 1, state.match);
  next.decks = structuredClone(state.decks);
  next.life = structuredClone(state.life);
  next.fatigue = structuredClone(state.fatigue);
  removeRecoveredCards(next);
  return next;
 }
 if (state.ready[player]) throw new Error("Você já está pronto. Aguarde o outro jogador.");
 const next = structuredClone(state);
 if (action.type === "ready") {
  if (state.slots[player].filter(Boolean).length !== 5) throw new Error("Preencha os 5 slots antes de ficar pronto.");
  if (missingRequiredCards(state, player).length) throw new Error("Todas as cartas Não age são obrigatórias nesta rodada.");
  if (state.slots[player].some(card => card && isFatigued(state, player, card))) throw new Error("Uma carta em Fadiga não pode ser jogada.");
  next.ready[player] = true;
  if (isRevealed(next)) {
   const battle = resolveBattle(next.slots, next.life);
   next.life = battle.life;
   next.result = battle.result;
   next.battle = battle.log;
   registerFatigue(next);
  }
 } else if (action.type === "place") {
  if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot > 4) throw new Error("Slot inválido.");
  if (action.card !== null && !cardsFor(player, state.decks[player]).includes(action.card)) throw new Error("Esta carta não pertence à sua mão.");
  if (action.card !== null && isFatigued(state, player, action.card)) throw new Error("Esta carta está em Fadiga e ainda não pode voltar à mão.");
  if (action.card !== null && state.slots[player].some((card, index) => card === action.card && index !== action.slot)) throw new Error("Esta carta já ocupa outro slot.");
  next.slots[player][action.slot] = action.card;
 } else { throw new Error("Ação inválida."); }
 return next;
}

export function roomView(input: GameState, player: Viewer, version: number): RoomView {
 const state = normalizeGameState(input);
 const revealed = isRevealed(state);
 return {
  decks: state.decks, version, match: state.match, round: state.round, initialLife: INITIAL_LIFE, life: state.life, result: state.result, battle: revealed ? state.battle : [], revealed, ownSlots: player === "spectator" ? [] : state.slots[player],
  fields: players.map(side => ({
   player: side, ready: state.ready[side],
   slots: state.slots[side].map(card => card === null ? null : revealed ? card : "hidden"),
  })),
  fatigue: players.map(side => ({
   player: side,
   cards: cardsFor(side, state.decks[side]).filter(card => isFatigued(state, side, card)).map(card => {
    const entry = state.fatigue[side][card];
    return { card, availableRound: entry.availableRound, remainingRounds: entry.availableRound - Math.max(state.round, entry.usedRound + 1) };
   }),
  })),
 };
}
