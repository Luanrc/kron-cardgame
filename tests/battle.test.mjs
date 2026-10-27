import { test } from "node:test";
import assert from "node:assert/strict";
import { definitionFor } from "../lib/cards.ts";
import { resolveSlot, resolveBattle, emptyBonuses } from "../lib/battle.ts";
const cards = (one, two) => ({1:definitionFor(1,one),2:definitionFor(2,two)});

test("damage trades simultaneously, defense absorbs one for one and cannot heal",()=>{
 assert.deepEqual(resolveSlot(cards("4","D")).damageTaken,{1:1,2:1});
 assert.deepEqual(resolveSlot(cards("4","C")).damageTaken,{1:0,2:0});
 assert.deepEqual(resolveSlot(cards("10","C")).damageTaken,{1:0,2:2});
 assert.deepEqual(resolveSlot(cards("4","A")).damageTaken,{1:0,2:1});
 assert.deepEqual(resolveSlot(cards("3","A")).damageTaken,{1:0,2:0});
});
test("Riposte needs actual damage, does not self-trigger and can be prevented by defense",()=>{
 const reactive = resolveSlot(cards("5","D"));
 assert.deepEqual(reactive.damageTaken,{1:1,2:2});
 assert.equal(reactive.riposteTriggered[1],true);
 assert.deepEqual(resolveSlot(cards("5","E")).damageTaken,{1:0,2:0});
 assert.deepEqual(resolveSlot(cards("8","H")).damageTaken,{1:0,2:0});
 const incoming = emptyBonuses(); incoming[1].defense = 1;
 const blocked = resolveSlot(cards("5","D"),incoming);
 assert.equal(blocked.riposteTriggered[1],false);
 assert.deepEqual(blocked.damageTaken,{1:0,2:0});
});
test("stun cancels the opposing card including its arrow, but preserves incoming bonuses",()=>{
 const incoming = emptyBonuses(); incoming[2].damage = 1;
 const combat = resolveSlot(cards("7","F"),incoming);
 assert.equal(combat.stunned[2],true);
 assert.deepEqual(combat.damageTaken,{1:1,2:0});
 assert.deepEqual(combat.outgoing,emptyBonuses());
 assert.deepEqual(resolveSlot(cards("7","G")).stunned,{1:true,2:true});
});
test("arrow affects only the next slot, including No action; slot five never spills into a new round",()=>{
 const battle = resolveBattle({1:["6","1",null,null,"9"],2:["A","B",null,null,"D"]},{1:10,2:10});
 assert.deepEqual(battle.life,{1:10,2:8});
 assert.equal(battle.log[1].damage[1],1);
 assert.equal(battle.log[2].damage[1],0);
 assert.equal(battle.log[4].damageTaken[1],0);
 const next = resolveBattle({1:["1","2",null,null,null],2:["D","A",null,null,null]},battle.life);
 assert.equal(next.life[1],9);
});
test("a lethal slot stops all later confrontations and clamps life to zero",()=>{
 const win = resolveBattle({1:["10","1",null,null,null],2:["A","J",null,null,null]},{1:1,2:2});
 assert.deepEqual(win.result,{type:"win",winner:1});
 assert.deepEqual(win.life,{1:1,2:0});
 assert.equal(win.log.length,1);
 const draw = resolveBattle({1:["4",null,null,null,null],2:["D",null,null,null,null]},{1:1,2:1});
 assert.deepEqual(draw.result,{type:"draw"});
 assert.deepEqual(draw.life,{1:0,2:0});
 assert.equal(draw.log.length,1);
});
