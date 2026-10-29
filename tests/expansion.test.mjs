import { advanceRound } from "./round-helpers.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog, deckFor, initialLifeFor, definitionFor } from "../lib/cards.ts";
import { summonerRules } from "../lib/expansion-cards.ts";
import { resolveSlot, resolveBattle, emptyBonuses } from "../lib/battle.ts";
import { newGame, applyAction, roomView, isFatigued, normalizeGameState } from "../lib/game.ts";
import { initialResources, validateResourcePlan } from "../lib/resources.ts";
const fields = (one = [], two = []) => ({ 1: [...one, ...Array(5 - one.length).fill(null)], 2: [...two, ...Array(5 - two.length).fill(null)] });
const definitions = (one, two) => ({ 1: definitionFor(1, one), 2: definitionFor(2, two) });
function chosen(one, two = "warrior") { return applyAction(applyAction(newGame(), 1, { type: "select_deck", deck: one }), 2, { type: "select_deck", deck: two }); }
function play(state, one, two) {
 for (let slot = 0; slot < 5; slot++) for (const player of [1, 2]) state = applyAction(state, player, { type: "place", slot, card: (player === 1 ? one : two)[slot] });
 state = applyAction(state, 1, { type: "ready" }); return applyAction(state, 2, { type: "ready" });
}

test("Expansion catalogs preserve all playable cards, life totals, duplicates and corrected summons", () => {
 for (const [deck, count, life] of [["gunner",10,10],["ranger",10,10],["guardian",10,12],["mage",12,8],["barbarian",10,9],["summoner",11,11]]) {
  assert.equal(catalog[deck].length, count); assert.equal(initialLifeFor(deck), life);
  assert.equal(deckFor(1, deck).length, count); assert.equal(deckFor(2, deck).length, count);
  assert.equal(catalog[deck].filter(card => card.effects.some(effect => effect.kind === "no_action")).length, 2);
 }
 assert.equal(catalog.mage[11].floating, undefined); assert.equal(catalog.mage[11].fatigue.rounds, 2);
 assert.equal(catalog.barbarian[9].fatigue.rounds, 3);
 assert.deepEqual(catalog.summoner[3].summon, { creature:"wolf",life:2,damage:1,defense:0 });
 assert.deepEqual(catalog.summoner[4].summon, { creature:"bear",life:3,damage:1,defense:1 });
 assert.equal(summonerRules.length, 3); assert.ok(catalog.summoner.every(card => !card.text.main.includes("REGRA")));
 assert.equal(chosen("summoner").life[1],11);
});

test("Guaranteed damage bypasses ordinary defense, but obeys Guardian defense, Deflect, Reflect and Stun", () => {
 assert.equal(resolveSlot(definitions("gunner-1-6","C")).damageTaken[2], 1);
 assert.equal(resolveSlot(definitions("gunner-1-6","guardian-2-3")).damageTaken[2], 0);
 assert.equal(resolveSlot(definitions("mage-1-7","guardian-2-3")).damageTaken[2], 1);
 assert.equal(resolveSlot(definitions("mage-1-7","monk-2-7")).damageTaken[2], 0);
 assert.equal(resolveSlot(definitions("mage-1-7","monk-2-9")).damageTaken[1], 2);
 assert.equal(resolveSlot(definitions("mage-1-7","G")).damageTaken[2], 0);
 assert.equal(resolveSlot(definitions("gunner-1-6","guardian-2-8")).damageTaken[2], 1, "not every Guardian defense blocks guaranteed damage");
});

test("Guardian special defense is a shared pool and cannot block a point twice", () => {
 const incoming = emptyBonuses(); incoming[1].damage = 1;
 const card = { ...catalog.gunner[5], effects: [{kind:"damage",amount:2,slot:"current",guaranteed:true}] };
 const result = resolveSlot({1:card,2:catalog.guardian[2]},incoming);
 assert.equal(result.defenseUsed[2],1);assert.equal(result.damageTaken[2],2);
});

test("Half guaranteed rounds down; Ranger and Gunner delayed arrows preserve gaps and discard overflow", () => {
 const half=resolveSlot(definitions("ranger-1-6","C"));assert.equal(half.guaranteedDamage[1],1);assert.equal(half.damageTaken[2],1);
 const delayed=resolveBattle(fields(["ranger-1-5"],["A","A","A"]),{1:10,2:10});
 assert.deepEqual(delayed.log.map(slot=>slot.damageTaken[2]),[0,0,1,0,0]);
 const gun=resolveBattle(fields(["gunner-1-7"]),{1:10,2:10});assert.deepEqual(gun.log.map(slot=>slot.damageTaken[2]),[1,0,1,0,0]);
 const overflow=resolveBattle(fields([null,null,null,null,"ranger-1-9"]),{1:10,2:10});assert.equal(overflow.life[2],9);
 const stunned=resolveBattle(fields(["ranger-1-9"],["G"]),{1:10,2:10});assert.equal(stunned.life[2],10);
});

test("Guardian extends defense across five slots and Vingar counts only defense through its own slot", () => {
 const result=resolveBattle(fields(["guardian-1-9","guardian-1-1","guardian-1-10"],["D","D","D","D","D"]),{1:12,2:10});
 assert.deepEqual(result.log.map(slot=>slot.defenseUsed[1]),[1,1,1,1,1]);
 assert.equal(result.log[2].revengeDamage[1],1);assert.equal(result.life[2],9);assert.equal(result.life[1],12);
 const atEnd=resolveBattle(fields([null,null,null,null,"guardian-1-9"],["A","A","A","A","D"]),{1:12,2:10});assert.equal(atEnd.life[1],12);
});

test("Atirador starts at six, caps reloads, pays once for arrows and never spends for stunned shots", () => {
 assert.equal(chosen("gunner").resources.ammo[1],6);
 const shot=resolveBattle(fields(["gunner-1-8"]),{1:10,2:10});assert.equal(shot.resources.ammo[1],2);assert.equal(shot.life[2],6);
 const stunned=resolveBattle(fields(["gunner-1-8"],["G"]),{1:10,2:10});assert.equal(stunned.resources.ammo[1],6);assert.equal(stunned.life[2],10);
 const blocked=resolveBattle(fields(["gunner-1-6"],["monk-2-7"]),{1:10,2:10});assert.equal(blocked.resources.ammo[1],5);
 const reloaded=resolveBattle(fields(["gunner-1-8","gunner-1-3","gunner-1-4"]),{1:10,2:10});assert.equal(reloaded.resources.ammo[1],6);
});

test("Atirador's four-per-round budget cannot be bypassed by reloading, placing or Ready", () => {
 let state=chosen("gunner");state=applyAction(state,1,{type:"place",slot:0,card:"gunner-1-8"});
 assert.throws(()=>applyAction(state,1,{type:"place",slot:1,card:"gunner-1-10"}),/máximo 4/);
 assert.throws(()=>validateResourcePlan(1,fields(["gunner-1-8","gunner-1-4","gunner-1-10"])[1],state.resources),/máximo 4/);
 const low=initialResources({1:"gunner",2:"warrior"});low.ammo[1]=0;
 assert.throws(()=>validateResourcePlan(1,fields(["gunner-1-8"])[1],low),/insuficiente/);
 assert.doesNotThrow(()=>validateResourcePlan(1,fields(["gunner-1-4","gunner-1-8"])[1],low));
});

test("Mage gains arcane when unhurt, can spend earlier gains, and stops effects if a conditional gain fails", () => {
 assert.deepEqual(chosen("mage").life,{1:8,2:10});assert.equal(chosen("mage").resources.arcane[1],2);
 const empty=initialResources({1:"mage",2:"warrior"});empty.arcane[1]=0;
 const success=resolveBattle(fields(["mage-1-4","mage-1-8"],["A","B"]),{1:8,2:10},{resources:empty});assert.equal(success.resources.arcane[1],0);assert.equal(success.life[2],6);
 const failed=resolveBattle(fields(["mage-1-4","mage-1-8"],["D","B"]),{1:8,2:10},{resources:empty});assert.equal(failed.log[1].resourceFailed[1],true);assert.equal(failed.life[2],9);
 const powerless=resolveBattle(fields(["mage-1-9"],["D"]),{1:8,2:10},{resources:empty});assert.equal(powerless.log[0].stunned[2],false);assert.equal(powerless.life[1],7);
 const safe=resolveBattle(fields(["mage-1-6"],["D"]),{1:8,2:10},{resources:empty});assert.equal(safe.resources.arcane[1],1);
 const gain=resolveBattle(fields(["mage-1-12"]),{1:8,2:10});assert.equal(gain.resources.arcane[1],5);
});

test("Barbarian uses simultaneous received damage, defense conditions and lost life before the current slot", () => {
 assert.equal(resolveSlot(definitions("barbarian-1-4","D")).damageTaken[2],2);
 assert.equal(resolveSlot(definitions("barbarian-1-7","D")).damageTaken[2],3);
 assert.deepEqual(resolveSlot(definitions("barbarian-1-7","barbarian-2-7")).damageTaken,{1:0,2:0});
 assert.equal(resolveSlot(definitions("barbarian-1-5","C")).damageTaken[2],0);
 const one=resolveBattle(fields(["barbarian-1-6"],["D"]),{1:7,2:10});assert.equal(one.life[2],10);
 const all=resolveBattle(fields(["barbarian-1-9"],["D"]),{1:7,2:10});assert.equal(all.life[2],8);
});

test("Fury removes No action obligations only next round and has three rounds of fatigue", () => {
 let state=play(chosen("barbarian"),["barbarian-1-1","barbarian-1-2","barbarian-1-10","barbarian-1-3","barbarian-1-4"],["A","B","C","D","E"]);
 assert.equal(roomView(state,1,1).noActionOptional[1],false);
 state=advanceRound(state);assert.equal(roomView(state,1,1).noActionOptional[1],true);assert.ok(isFatigued(state,1,"barbarian-1-10"));
 assert.equal(state.fatigue[1]["barbarian-1-10"].availableRound,5);
 state=play(state,["barbarian-1-3","barbarian-1-4","barbarian-1-5","barbarian-1-6","barbarian-1-7"],["A","B","C","D","E"]);
 state=advanceRound(state);assert.equal(roomView(state,1,1).noActionOptional[1],false);
});

test("Premonition requires an early locked No action choice and leaks no slot to spectators", () => {
 let state=play(chosen("mage"),["mage-1-1","mage-1-2","mage-1-10","mage-1-3","mage-1-5"],["A","B","C","D","E"]);
 state=advanceRound(state);assert.deepEqual(state.visions[1],{round:2,slot:null});
 assert.throws(()=>applyAction(state,2,{type:"place",slot:0,card:"D"}),/primeiro/);
 state=applyAction(state,2,{type:"foretell",slot:3});
 assert.throws(()=>applyAction(state,2,{type:"place",slot:3,card:null}),/travado/);
 assert.throws(()=>applyAction(state,2,{type:"foretell",slot:2}),/Não há/);
 assert.equal(roomView(state,1,1).fields.find(field=>field.player===2).slots[3],"A");
 assert.equal(roomView(state,"spectator",1).fields.find(field=>field.player===2).slots[3],"hidden");
 assert.equal(roomView(state,"spectator",1).visions[1].slot,null);
 assert.equal(normalizeGameState(state).visions[1].slot,3);
});

test("Fury prevents Premonition from imposing a No action card next round", () => {
 let state=play(chosen("mage","barbarian"),["mage-1-1","mage-1-2","mage-1-10","mage-1-3","mage-1-5"],["barbarian-2-1","barbarian-2-2","barbarian-2-10","barbarian-2-3","barbarian-2-4"]);
 assert.equal(state.visions[1],null);
 state=advanceRound(state);assert.equal(roomView(state,2,1).noActionOptional[2],true);
 assert.doesNotThrow(()=>applyAction(state,2,{type:"place",slot:0,card:"barbarian-2-3"}));
 assert.throws(()=>applyAction(state,2,{type:"foretell",slot:0}),/Não há/);
});

test("Reflect acts on offenses without modifying Arcane generation or reflecting the resource", () => {
 const result=resolveBattle(fields(["mage-1-4"],["monk-2-9"]),{1:8,2:10});
 assert.equal(result.life[1],7);assert.equal(result.resources.arcane[1],3);assert.equal(result.resources.arcane[2],0);
 const current=resolveBattle(fields(["mage-1-5","mage-1-9"],["monk-2-1","monk-2-9"]),{1:8,2:10},{resources:{ammo:{1:0,2:0},arcane:{1:1,2:0}}});
 assert.equal(current.log[1].stunned[2],true,"earlier arcane generation still pays a later Stun");
 const poor=resolveBattle(fields(["mage-1-3","mage-1-9"],["monk-2-1","monk-2-9"]),{1:8,2:10},{resources:{ammo:{1:0,2:0},arcane:{1:0,2:0}}});
 assert.equal(poor.log[1].resourceFailed[1],true);assert.equal(poor.log[1].stunned[2],false);
});
