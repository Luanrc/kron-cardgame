import { advanceRound } from "./round-helpers.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../lib/cards.ts";
import { newGame, applyAction, roomView, filledSlotsCount, isSummonActive, availableCardsFor, resetMatch } from "../lib/game.ts";
import { resolveBattle } from "../lib/battle.ts";
import { emptyCreatures, emptyAttackTargets, createCreature, creaturesForNextRound } from "../lib/creatures.ts";
const fields=(one=[],two=[])=>({1:[...one,...Array(5-one.length).fill(null)],2:[...two,...Array(5-two.length).fill(null)]});
const chosen=()=>applyAction(newGame(),1,{type:"select_deck",deck:"summoner"});
const targets=(slot=0)=>{const targets=emptyAttackTargets();targets[2][slot]="creature";return targets;};
const wolf=()=>createCreature(catalog.summoner[3],"summoner-1-4");
function occupied(){const creatures=emptyCreatures();creatures[1][0]=wolf();return creatures;}

test("A newly summoned Wolf acts immediately and can die simultaneously without overflowing damage to its owner",()=>{
 const result=resolveBattle(fields(["summoner-1-4"],["J"]),{1:11,2:10},{attackTargets:targets()});
 assert.deepEqual(result.life,{1:11,2:9});assert.equal(result.creatures[1][0],null);
 assert.equal(result.log[0].creatureDamageTaken[1],3);assert.equal(result.log[0].creatureDamageDealt[1],1);
});

test("The Bear attacks unconditionally and its defense protects only the Bear",()=>{
 const cards=fields(["summoner-1-5"],["J"]);
 const owner=resolveBattle(cards,{1:11,2:10});assert.deepEqual(owner.life,{1:8,2:9});assert.equal(owner.creatures[1][0].life,3);
 const bear=resolveBattle(cards,{1:11,2:10},{attackTargets:targets()});assert.deepEqual(bear.life,{1:11,2:9});assert.equal(bear.creatures[1][0].life,1);assert.equal(bear.log[0].creatureRiposteTriggered[1],false);
 const blocked=resolveBattle(fields(["summoner-1-5"],["D"]),{1:11,2:10},{attackTargets:targets()});assert.equal(blocked.creatures[1][0].life,3);assert.equal(blocked.life[2],9);
 const guaranteed=resolveBattle(fields(["summoner-1-5"],["mage-2-7"]),{1:11,2:8},{attackTargets:targets()});assert.equal(guaranteed.creatures[1][0].life,1);assert.equal(guaranteed.life[2],7);
});

test("Selecting a creature in an empty slot falls back to attacking the player",()=>{
 const result=resolveBattle(fields(["summoner-1-3"],["D"]),{1:11,2:10},{attackTargets:targets()});assert.deepEqual(result.life,{1:10,2:9});
});

test("Persistent creatures occupy slots without cards, and only strengthening overlays can be placed there",()=>{
 let state=chosen();state.creatures=occupied();assert.equal(filledSlotsCount(state,1),1);
 assert.throws(()=>applyAction(state,1,{type:"place",slot:0,card:"summoner-1-1"}),/só aceitam/);
 assert.throws(()=>applyAction(state,1,{type:"place",slot:1,card:"summoner-1-6"}),/só pode/);
 state=applyAction(state,1,{type:"place",slot:0,card:"summoner-1-6"});assert.equal(filledSlotsCount(state,1),1);
 state=applyAction(state,1,{type:"place",slot:0,card:null});assert.equal(state.creatures[1][0].life,2);
 for(const [slot,card] of [[1,"summoner-1-1"],[2,"summoner-1-2"],[3,"summoner-1-3"],[4,"summoner-1-11"]])state=applyAction(state,1,{type:"place",slot,card});
 assert.equal(filledSlotsCount(state,1),5);assert.doesNotThrow(()=>applyAction(state,1,{type:"ready"}));
});

test("A living creature prevents another of its kind even after its card leaves fatigue",()=>{
 let state=chosen();state.creatures=occupied();state.round=4;
 assert.ok(isSummonActive(state,1,"summoner-1-4"));assert.ok(!availableCardsFor(state,1).includes("summoner-1-4"));
 assert.throws(()=>applyAction(state,1,{type:"place",slot:4,card:"summoner-1-4"}),/já possui/);
 assert.doesNotThrow(()=>applyAction(state,1,{type:"place",slot:4,card:"summoner-1-5"}));
 state.creatures[1][0]=null;assert.ok(availableCardsFor(state,1).includes("summoner-1-4"));
});

test("Permanent strengthening survives rounds; temporary damage/defense expire and bonus life raises current and maximum life",()=>{
 const creatures=occupied();creatures[1][0].life=1;
 const permanent=resolveBattle(fields(["summoner-1-8"]),{1:11,2:10},{creatures});assert.equal(permanent.creatures[1][0].damage,2);assert.equal(permanent.life[2],8);
 const temporary=resolveBattle(fields(["summoner-1-6"]),permanent.life,{creatures:creaturesForNextRound(permanent.creatures)});assert.equal(temporary.creatures[1][0].temporaryDamage,1);assert.equal(temporary.life[2],5);
 const next=creaturesForNextRound(temporary.creatures);assert.equal(next[1][0].damage,2);assert.equal(next[1][0].temporaryDamage,0);
 const healed=resolveBattle(fields(["summoner-1-10"]),{1:11,2:10},{creatures});assert.equal(healed.creatures[1][0].life,2);assert.equal(healed.creatures[1][0].maxLife,3);
 const defended=resolveBattle(fields(["summoner-1-7"],["D"]),{1:11,2:10},{creatures,attackTargets:targets()});assert.equal(defended.creatures[1][0].life,1);assert.equal(creaturesForNextRound(defended.creatures)[1][0].temporaryDefense,0);
});

test("Stun prevents summoning, strengthening and the creature's action without deleting an existing creature",()=>{
 const summon=resolveBattle(fields(["summoner-1-4"],["G"]),{1:11,2:10});assert.equal(summon.creatures[1][0],null);assert.equal(summon.life[2],10);
 const buff=resolveBattle(fields(["summoner-1-8"],["G"]),{1:11,2:10},{creatures:occupied()});assert.equal(buff.creatures[1][0].damage,1);assert.equal(buff.life[2],10);
});

test("Reflected creature attacks return to that creature, not the summoner",()=>{
 const result=resolveBattle(fields(["summoner-1-4"],["monk-2-9"]),{1:11,2:10});assert.deepEqual(result.life,{1:11,2:10});assert.equal(result.creatures[1][0].life,1);
});

test("Bleeding inflicted on a creature ticks on that creature, expires and disappears on death",()=>{
 const first=resolveBattle(fields(["summoner-1-4"],["rogue-2-3"]),{1:11,2:10},{attackTargets:targets()});
 assert.equal(first.creatures[1][0].life,1);assert.equal(first.creatures[1][0].bleeding,1);assert.equal(first.bleeding[1][0],0);assert.equal(first.life[1],11);
 const second=resolveBattle(fields([],["A"]),first.life,{creatures:creaturesForNextRound(first.creatures),bleeding:first.bleeding});
 assert.equal(second.creatures[1][0],null);assert.equal(second.life[1],11);assert.equal(second.life[2],8);assert.equal(second.log[0].creatureBleedingTaken[1],1);
 const dead=resolveBattle(fields(["summoner-1-4"],["gunner-2-9"]),{1:11,2:10},{attackTargets:targets()});assert.equal(dead.creatures[1][0],null);assert.equal(dead.bleeding[1][0],0);
});

test("Attack targets are validated, private before reveal and locked at Ready; creatures remain public",()=>{
 let state=chosen();state.creatures=occupied();
 state=applyAction(state,2,{type:"attack_target",slot:0,target:"creature"});
 assert.equal(roomView(state,1,1).attackTargets[2],null);assert.deepEqual(roomView(state,"spectator",1).attackTargets,{1:null,2:null});assert.equal(roomView(state,"spectator",1).creatures[1][0].life,2);
 assert.throws(()=>applyAction(state,2,{type:"attack_target",slot:5,target:"creature"}),/inválido/);assert.throws(()=>applyAction(state,2,{type:"attack_target",slot:0,target:"other"}),/inválido/);
 for(const [slot,card] of ["A","B","C","D","E"].entries())state=applyAction(state,2,{type:"place",slot,card});state=applyAction(state,2,{type:"ready"});
 assert.throws(()=>applyAction(state,2,{type:"attack_target",slot:0,target:"player"}),/já está pronto/);
 state=applyAction(state,1,{type:"place",slot:0,card:"summoner-1-8"});assert.equal(roomView(state,"spectator",1).creatures[1][0].damage,1);assert.equal(roomView(state,"spectator",1).fields[0].slots[0],null);
});

test("New round preserves creatures and health but clears target plans; restarts and full reset clear all creatures",()=>{
 let state=chosen();state.creatures=occupied();state.attackTargets=targets();state.ready={1:true,2:true};state.life[1]=7;
 state=advanceRound(state);assert.equal(state.creatures[1][0].life,2);assert.equal(state.life[1],7);assert.deepEqual(state.attackTargets,emptyAttackTargets());
 state.result={type:"win",winner:2};state.life[1]=0;const restarted=applyAction(state,2,{type:"restart"});assert.deepEqual(restarted.creatures,emptyCreatures());assert.equal(restarted.life[1],11);
 assert.deepEqual(resetMatch(state).creatures,emptyCreatures());
});

test("Premonition cannot lock a No action card onto an occupied creature slot",()=>{
 let state=chosen();state.creatures=occupied();state.visions[2]={round:1,slot:null};
 assert.throws(()=>applyAction(state,1,{type:"foretell",slot:0}),/livre de invocações/);
 state=applyAction(state,1,{type:"foretell",slot:1});assert.equal(state.slots[1][1],"summoner-1-1");
});
