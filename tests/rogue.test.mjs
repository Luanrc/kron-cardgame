import { advanceRound } from "./round-helpers.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { rogueCards, warriorCards, monkCards, deckFor, validateDeck, isMandatoryCard } from "../lib/cards.ts";
import { resolveBattle, resolveSlot, emptyBonuses } from "../lib/battle.ts";
import { newGame, applyAction, roomView, normalizeGameState } from "../lib/game.ts";
import { emptySlotCounters, emptyFloating, validateTargets, targetSlots } from "../lib/targeting.ts";
const life={1:10,2:10};
const slots=(one,two)=>({1:[...one,...Array(5-one.length).fill(null)],2:[...two,...Array(5-two.length).fill(null)]});

test("Rogue reference keeps all ten cards, duplicate bleeding attacks and two mandatory No action cards",()=>{
 assert.equal(rogueCards.length,10);
 assert.equal(rogueCards.filter(isMandatoryCard).length,2);
 assert.doesNotThrow(()=>validateDeck(rogueCards));
 assert.deepEqual(rogueCards[2].effects,rogueCards[3].effects);
 assert.deepEqual(rogueCards[2].bleeding,rogueCards[3].bleeding);
 assert.deepEqual(rogueCards.map(card=>card.fatigue?.rounds??0),[0,0,0,0,0,1,1,2,1,2]);
 assert.deepEqual(rogueCards[8].floating,{effect:"damage",range:1,points:2});
 assert.deepEqual(rogueCards[9].floating,{effect:"bleeding",range:3,points:1});
 assert.equal(rogueCards[9].bleeding.doubleAfterAdding,true);
 assert.ok(rogueCards.every(card=>![...card.text.main,...card.text.footer].join(" ").includes("MA")));
 assert.equal(new Set([1,2].flatMap(player=>["warrior","monk","rogue"].flatMap(deck=>deckFor(player,deck).map(card=>card.instanceId)))).size,60);
});

test("Floating validates integer points within reach, allows splitting or stacking, and never wraps",()=>{
 assert.deepEqual(targetSlots(0,1),[0,1]);
 assert.deepEqual(targetSlots(4,3),[1,2,3,4]);
 assert.doesNotThrow(()=>validateTargets(rogueCards[8],1,[0,2]));
 assert.doesNotThrow(()=>validateTargets(rogueCards[8],1,[2,2]));
 for(const targets of [[0],[0,2,2],[-1,1],[1,5],[1,1.5],["1",1],[0,3],null]) assert.throws(()=>validateTargets(rogueCards[8],1,targets),/Flutuando/);
 assert.throws(()=>validateTargets(rogueCards[9],4,[0]),/Flutuando/);
});

test("Floating damage is moved and split without duplicating the source attack; target defenses still work",()=>{
 const floating=emptyFloating(); floating[1]["rogue-1-9"]=[0,2];
 const fields=slots(["rogue-1-1","rogue-1-9","rogue-1-2"],["A","B","C"]);
 const result=resolveBattle(fields,life,{floating});
 assert.deepEqual(result.life,{1:10,2:9});
 assert.deepEqual(result.log.slice(0,3).map(slot=>slot.damage[1]),[1,0,1]);
 // Source stun cancels all allocations, including an earlier target.
 const sourceStun=resolveBattle({...fields,2:["A","G","C",null,null]},life,{floating});
 assert.deepEqual(sourceStun.life,life);
 // Stun at a target suppresses only the card there, not a different source.
 const targetStun=resolveBattle({...fields,2:["G","B","C",null,null]},life,{floating});
 assert.equal(targetStun.life[2],9);
});

test("Bleeding is created only by actual damage from that card, never a blocked attack or unrelated bonus",()=>{
 for(const defense of ["C","monk-2-7","monk-2-9","G"]) {
  const result=resolveBattle(slots(["rogue-1-3"],[defense]),life);
  assert.deepEqual(result.bleeding,emptySlotCounters());
 }
 const hit=resolveBattle(slots(["rogue-1-3"],["A"]),life);
 assert.equal(hit.bleeding[2][0],1);
 assert.equal(hit.log[0].currentDamageDealt[1],1);
 // A blocked card cannot claim damage dealt by another card's arrow.
 const mixed=resolveBattle(slots(["6","rogue-1-3"],["A","C"]),life);
 assert.equal(mixed.log[1].damageTaken[2],1);
 assert.equal(mixed.log[1].currentDamageDealt[1],0);
 assert.deepEqual(mixed.bleeding,emptySlotCounters());
});

test("The Rogue arrow causes two hits but applies Bleeding only in its current slot",()=>{
 const result=resolveBattle(slots(["rogue-1-7","rogue-1-1"],["A","B"]),life);
 assert.deepEqual(result.life,{1:10,2:8});
 assert.deepEqual(result.bleeding[2],[1,0,0,0,0]);
 const atFive=resolveBattle(slots([null,null,null,null,"rogue-1-7"],[]),life);
 assert.deepEqual(atFive.bleeding[2],[0,0,0,0,1]);
 assert.equal(atFive.life[2],9);
});

test("Pending Bleeding is blocked by defense or Deflect, never reflected, and expires after one round",()=>{
 const context={bleeding:{1:2,2:0}};
 const normal=resolveSlot({1:warriorCards[0],2:warriorCards[0]},emptyBonuses(),undefined,context);
 assert.deepEqual(normal.damageTaken,{1:2,2:0});
 assert.deepEqual(normal.bleedingTaken,{1:2,2:0});
 assert.equal(resolveSlot({1:warriorCards[2],2:warriorCards[0]},emptyBonuses(),undefined,context).damageTaken[1],1);
 assert.equal(resolveSlot({1:monkCards[6],2:warriorCards[0]},emptyBonuses(),undefined,context).damageTaken[1],0);
 const reflected=resolveSlot({1:monkCards[8],2:warriorCards[0]},emptyBonuses(),undefined,context);
 assert.deepEqual(reflected.damageTaken,{1:2,2:0});
 assert.deepEqual(reflected.reflected,{1:0,2:0});
 const bleeding=emptySlotCounters(); bleeding[1][0]=2;
 const fields=slots(["monk-1-9"],["A"]);
 const result=resolveBattle(fields,life,{bleeding});
 assert.deepEqual(result.life,{1:8,2:10});
 assert.deepEqual(result.bleeding,emptySlotCounters());
 assert.deepEqual(resolveBattle(fields,result.life,{bleeding:result.bleeding}).life,result.life);
});

test("Shared defense is spent once, prioritizing pending Bleeding before a reflected normal attack",()=>{
 const incoming=emptyBonuses(); incoming[1].defense=1;
 const result=resolveSlot({1:monkCards[8],2:warriorCards[3]},incoming,undefined,{bleeding:{1:1,2:0}});
 assert.deepEqual(result.damageTaken,{1:0,2:1});
 assert.deepEqual(result.reflected,{1:1,2:0});
 assert.deepEqual(result.bleedingTaken,{1:0,2:0});
});

test("Floating 3 keeps damage at the source and adds then doubles future Bleeding at the chosen destination",()=>{
 const floating=emptyFloating(); floating[1]["rogue-1-10"]=[1];
 const fields=slots(["rogue-1-1","rogue-1-3",null,"rogue-1-10"],["A","B",null,"D"]);
 const result=resolveBattle(fields,life,{floating});
 assert.deepEqual(result.bleeding[2],[0,4,0,0,0]);
 assert.equal(result.log[3].damage[1],1);
 assert.equal(result.log[3].bleedingApplied[0].target,2);
 assert.equal(result.log[3].bleedingApplied[0].added,3);
 const blocked=resolveBattle({...fields,2:["A","B",null,"C",null]},life,{floating});
 assert.equal(blocked.bleeding[2][1],1);
 // Spent markers from the current round are not resurrected by doubling.
 const bleeding=emptySlotCounters(); bleeding[2][1]=2;
 const next=resolveBattle(slots([null,null,null,"rogue-1-10"],[null,null,null,"A"]),life,{floating,bleeding});
 assert.equal(next.bleeding[2][1],2);
});

test("Floating plans persist secretly before reveal, lock at Ready and reset without leaking opponent choices",()=>{
 let state=applyAction(newGame(),1,{type:"select_deck",deck:"rogue"});
 const one=["rogue-1-1","rogue-1-2","rogue-1-9","rogue-1-3","rogue-1-10"];
 const two=["A","B","C","D","E"];
 for(let slot=0;slot<5;slot++) {
  state=applyAction(state,1,{type:"place",slot,card:one[slot]});
  state=applyAction(state,2,{type:"place",slot,card:two[slot]});
 }
 state=applyAction(state,1,{type:"aim",card:"rogue-1-9",targets:[1,3]});
 state=applyAction(state,1,{type:"aim",card:"rogue-1-10",targets:[1]});
 assert.deepEqual(roomView(state,2,0).floating,emptyFloating());
 assert.deepEqual(roomView(state,"spectator",0).floating,emptyFloating());
 assert.deepEqual(roomView(state,1,0).floating[1]["rogue-1-9"],[1,3]);
 assert.throws(()=>applyAction(state,1,{type:"aim",card:"rogue-1-9",targets:[0,4]}),/Flutuando/);
 assert.throws(()=>applyAction(state,2,{type:"aim",card:"rogue-1-9",targets:[1,3]}),/Coloque/);
 const missing=structuredClone(state); delete missing.floating[1]["rogue-1-9"];
 assert.throws(()=>applyAction(missing,1,{type:"ready"}),/Flutuando/);
 state=applyAction(state,1,{type:"ready"});
 assert.throws(()=>applyAction(state,1,{type:"aim",card:"rogue-1-9",targets:[2,2]}),/pronto/);
 state=applyAction(state,2,{type:"ready"});
 assert.deepEqual(roomView(state,"spectator",0).floating,state.floating);
 const markers=structuredClone(state.bleeding);
 state=advanceRound(state);
 assert.deepEqual(state.floating,emptyFloating());
 assert.deepEqual(state.bleeding,markers);
 assert.equal(roomView(state,1,0).bleedingRound,2);
 state.life={1:0,2:1}; state.result={type:"win",winner:2};
 const restarted=applyAction(state,2,{type:"restart"});
 assert.deepEqual(restarted.bleeding,emptySlotCounters());
 assert.deepEqual(restarted.floating,emptyFloating());
 assert.deepEqual(normalizeGameState({...newGame(),bleeding:undefined,floating:undefined}).bleeding,emptySlotCounters());
});
