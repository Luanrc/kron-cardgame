import { advanceRound } from "./round-helpers.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { paladinCards, validateDeck, isMandatoryCard } from "../lib/cards.ts";
import { newGame, applyAction, roomView, normalizeGameState } from "../lib/game.ts";
import { resolveBattle } from "../lib/battle.ts";
import { emptyHolySpending, holyEffectValue, potentialHolyPower } from "../lib/holy-power.ts";
import { emptyFloating, emptySlotCounters, validateTargets } from "../lib/targeting.ts";
const life={1:10,2:10};
const fields=(one,two)=>({1:[...one,...Array(5-one.length).fill(null)],2:[...two,...Array(5-two.length).fill(null)]});

test("Paladin reference preserves duplicate attacks and defenses, two mandatory cards and all fatigue values",()=>{
 assert.equal(paladinCards.length,10);
 assert.equal(paladinCards.filter(isMandatoryCard).length,2);
 assert.doesNotThrow(()=>validateDeck(paladinCards));
 assert.deepEqual(paladinCards[2].effects,paladinCards[3].effects);
 assert.deepEqual(paladinCards[4].effects,paladinCards[5].effects);
 assert.deepEqual(paladinCards.map(card=>card.holyPower?.gain??0),[0,0,1,1,1,1,0,4,0,0]);
 assert.deepEqual(paladinCards.map(card=>card.fatigue?.rounds??0),[0,0,0,0,0,0,1,2,2,2]);
 assert.deepEqual(paladinCards[8].effects,[{kind:"defense",amount:3,slot:"current"},{kind:"defense",amount:3,slot:"next"}]);
 assert.deepEqual(paladinCards[9].floating,{effect:"defense",range:1,points:1,direction:"forward"});
});

test("Holy Power is earned by actual own damage or used defense, never an unsuccessful or stunned action",()=>{
 assert.equal(resolveBattle(fields(["paladin-1-3"],["A"]),life).holyPower[1],1);
 for(const blocker of ["C","monk-2-7","monk-2-9","G"]) assert.equal(resolveBattle(fields(["paladin-1-3"],[blocker]),life).holyPower[1],0);
 assert.equal(resolveBattle(fields(["paladin-1-5"],["D"]),life).holyPower[1],1);
 assert.equal(resolveBattle(fields(["paladin-1-5"],["A"]),life).holyPower[1],0);
 const bleeding=emptySlotCounters(); bleeding[1][0]=1;
 assert.equal(resolveBattle(fields(["paladin-1-5"],["A"]),life,{bleeding}).holyPower[1],1);
 assert.equal(resolveBattle(fields(["paladin-1-5"],["G"]),life,{bleeding}).holyPower[1],0);
 assert.equal(resolveBattle(fields(["6","paladin-1-3"],["A","C"]),life).holyPower[1],0);
 assert.equal(resolveBattle(fields(["paladin-1-8"],["A"]),life).holyPower[1],4);
 assert.equal(resolveBattle(fields(["paladin-1-8"],["G"]),life).holyPower[1],0);
});

test("Chosen Holy Power is consumed in full, half becomes X rounded down, and unused points remain",()=>{
 const holySpending=emptyHolySpending(); holySpending[1]["paladin-1-7"]=6;
 const result=resolveBattle(fields(["paladin-1-7"],["A"]),life,{holyPower:{1:8,2:0},holySpending});
 assert.deepEqual(result.life,{1:10,2:7});
 assert.deepEqual(result.holyPower,{1:2,2:0});
 assert.equal(result.log[0].holyValue[1],3);
 assert.equal(result.log[0].holyPowerSpent[1],6);
 holySpending[1]["paladin-1-7"]=5;
 const odd=resolveBattle(fields(["paladin-1-7"],["A"]),life,{holyPower:{1:8,2:0},holySpending});
 assert.deepEqual(odd.life,{1:10,2:8});
 assert.equal(odd.holyPower[1],3);
 assert.equal(holyEffectValue(5),2);
 const stunned=resolveBattle(fields(["paladin-1-7"],["G"]),life,{holyPower:{1:8,2:0},holySpending});
 assert.equal(stunned.holyPower[1],8);
 assert.equal(stunned.log[0].holyPowerSpent[1],0);
 const unused=resolveBattle(fields(["paladin-1-7"],["A"]),life,{holyPower:{1:8,2:0}});
 assert.equal(unused.holyPower[1],8);
 assert.deepEqual(unused.life,life);
});

test("Earlier successful actions fund a later X card in the same round; failed forecasts are capped at the actual balance",()=>{
 const holySpending=emptyHolySpending(); holySpending[1]["paladin-1-7"]=5;
 const cards=fields(["paladin-1-8","paladin-1-3","paladin-1-7"],["A","B","C"]);
 const funded=resolveBattle(cards,life,{holySpending});
 assert.equal(funded.log[2].holyPowerSpent[1],5);
 assert.equal(funded.log[2].holyValue[1],2);
 assert.equal(funded.holyPower[1],0);
 const blocked=resolveBattle({...cards,2:["G","C","A",null,null]},life,{holySpending});
 assert.equal(blocked.log[2].holyPowerSpent[1],0);
 assert.equal(blocked.holyPower[1],0);
 const partial=resolveBattle({...cards,2:["A","C","B",null,null]},life,{holySpending});
 assert.equal(partial.log[2].holyPowerSpent[1],4);
 assert.equal(partial.log[2].holyValue[1],2);
 const future=resolveBattle(fields(["paladin-1-7","paladin-1-8"],["A","B"]),life,{holySpending});
 assert.equal(future.log[0].holyPowerSpent[1],0);
 assert.equal(future.holyPower[1],4);
});

test("Holy defense uses the source-slot balance and can target only current or next slot",()=>{
 const holySpending=emptyHolySpending(); holySpending[1]["paladin-1-10"]=6;
 const floating=emptyFloating(); floating[1]["paladin-1-10"]=[2];
 const cards=fields(["paladin-1-1","paladin-1-10","paladin-1-2"],["A","B","J"]);
 const shield=resolveBattle(cards,life,{holyPower:{1:8,2:0},holySpending,floating});
 assert.equal(shield.log[1].holyPowerSpent[1],6);
 assert.equal(shield.log[2].defense[1],3);
 assert.deepEqual(shield.life,life);
 assert.equal(shield.holyPower[1],2);
 const stunned=resolveBattle({...cards,2:["A","G","J",null,null]},life,{holyPower:{1:8,2:0},holySpending,floating});
 assert.equal(stunned.holyPower[1],8);
 assert.equal(stunned.life[1],7);
 floating[1]["paladin-1-10"]=[1];
 const current=resolveBattle({...cards,2:["A","J","B",null,null]},life,{holyPower:{1:8,2:0},holySpending,floating});
 assert.deepEqual(current.life,life);
 assert.doesNotThrow(()=>validateTargets(paladinCards[9],1,[2]));
 assert.throws(()=>validateTargets(paladinCards[9],1,[0]),/Flutuando/);
 assert.throws(()=>validateTargets(paladinCards[9],1,[3]),/Flutuando/);
});

test("Spending is validated, private until reveal, locked at Ready, and balances persist only between rounds",()=>{
 let state=applyAction(newGame(),1,{type:"select_deck",deck:"paladin"});
 for(const[slot,card]of ["paladin-1-1","paladin-1-2","paladin-1-8","paladin-1-3","paladin-1-7"].entries())state=applyAction(state,1,{type:"place",slot,card});
 for(const[slot,card]of ["A","B","C","D","E"].entries())state=applyAction(state,2,{type:"place",slot,card});
 assert.equal(potentialHolyPower(1,state.slots[1],"paladin-1-7",0),5);
 for(const amount of [-1,1.5,"4",6,null]) assert.throws(()=>applyAction(state,1,{type:"holy_spend",card:"paladin-1-7",amount}),/Gasto/);
 state=applyAction(state,1,{type:"holy_spend",card:"paladin-1-7",amount:2});
 assert.deepEqual(roomView(state,"spectator",0).holySpending,emptyHolySpending());
 assert.deepEqual(roomView(state,2,0).holySpending,emptyHolySpending());
 assert.equal(roomView(state,1,0).holySpending[1]["paladin-1-7"],2);
 assert.throws(()=>applyAction(state,2,{type:"holy_spend",card:"paladin-1-7",amount:2}),/Coloque/);
 state=applyAction(state,1,{type:"ready"});
 assert.throws(()=>applyAction(state,1,{type:"holy_spend",card:"paladin-1-7",amount:0}),/pronto/);
 state=applyAction(state,2,{type:"ready"});
 assert.equal(state.holyPower[1],3);
 assert.equal(roomView(state,"spectator",0).holySpending[1]["paladin-1-7"],2);
 state=advanceRound(state);
 assert.equal(state.holyPower[1],3);
 assert.deepEqual(state.holySpending,emptyHolySpending());
 state.life={1:0,2:1};state.result={type:"win",winner:2};
 const restarted=applyAction(state,1,{type:"restart"});
 assert.deepEqual(restarted.holyPower,{1:0,2:0});
 assert.deepEqual(restarted.holySpending,emptyHolySpending());
 assert.deepEqual(normalizeGameState({...newGame(),holyPower:undefined,holySpending:undefined}).holyPower,{1:0,2:0});
});

test("Unresolved slots after a lethal hit do not generate or spend Holy Power",()=>{
 const holySpending=emptyHolySpending();holySpending[1]["paladin-1-7"]=6;
 const result=resolveBattle(fields(["paladin-1-1","paladin-1-8","paladin-1-7"],["J","A","B"]),{1:1,2:10},{holyPower:{1:8,2:0},holySpending});
 assert.equal(result.log.length,1);
 assert.equal(result.holyPower[1],8);
});

test("Only one resource-based card may be placed per player per round, including when X is zero",()=>{
 let state=applyAction(newGame(),1,{type:"select_deck",deck:"paladin"});
 state=applyAction(state,1,{type:"place",slot:0,card:"paladin-1-7"});
 assert.throws(()=>applyAction(state,1,{type:"place",slot:1,card:"paladin-1-10"}),/apenas uma carta/);
 // Replacing the current resource card is allowed, without occupying two slots.
 state=applyAction(state,1,{type:"place",slot:0,card:"paladin-1-10"});
 assert.equal(state.slots[1][0],"paladin-1-10");
 state=applyAction(state,1,{type:"place",slot:0,card:null});
 state=applyAction(state,1,{type:"place",slot:1,card:"paladin-1-7"});
 assert.equal(state.slots[1][1],"paladin-1-7");
 const invalid=structuredClone(state);
 invalid.slots[1]=["paladin-1-1","paladin-1-2","paladin-1-7","paladin-1-10","paladin-1-3"];
 assert.throws(()=>applyAction(invalid,1,{type:"ready"}),/apenas uma carta/);
});
