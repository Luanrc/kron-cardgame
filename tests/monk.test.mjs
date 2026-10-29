import { advanceRound } from "./round-helpers.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { monkCards, warriorCards, deckFor, definitionFor, isMandatoryCard, validateDeck } from "../lib/cards.ts";
import { newGame, applyAction, roomView, availableCardsFor, normalizeGameState } from "../lib/game.ts";
import { resolveSlot, resolveBattle, emptyBonuses } from "../lib/battle.ts";

test("Monk catalog preserves the reference, duplicate ripostes and independent card instances", () => {
 assert.equal(monkCards.length,10);
 assert.deepEqual(monkCards.map(card=>[...card.text.main,...card.text.footer]),[
  ["Não age"],["Não age"],["+1 dano"],["+1 def"],
  ["+1 def e +2 dano","Ripostar"],["+1 def e +2 dano","Ripostar"],
  ["Defletir","Anula todo o dano recebido neste slot.","(Fadiga 2)"],
  ["Atordoamento","(Fadiga 1)"],
  ["Refletir ← Refletir","Anula e devolve o dano dos slots anterior e atual.","(Fadiga 2)"],
  ["Ripostar: +2 dano","Se ativar: +4 def no próximo slot","(Fadiga 2)"],
 ]);
 assert.deepEqual(monkCards[4].effects,monkCards[5].effects);
 assert.equal(monkCards.filter(isMandatoryCard).length,2);
 assert.doesNotThrow(()=>validateDeck(monkCards));
 assert.ok(monkCards.filter(isMandatoryCard).every(card=>!card.fatigue));
 assert.equal(new Set([...deckFor(1),...deckFor(2),...deckFor(1,"monk"),...deckFor(2,"monk")].map(card=>card.instanceId)).size,40);
 assert.equal(definitionFor(2,"monk-1-9"),undefined);
 assert.equal(definitionFor(1,"monk-1-9").classId,"monk");
 assert.ok([...monkCards,...warriorCards].every(card=>![...card.text.main,...card.text.footer].join(" ").includes("MA")));
});

test("Monk defense is always active, while both riposte copies react to attacks blocked by defense",()=>{
 for(const number of [5,6]) {
  const card=monkCards[number-1];
  const blocked=resolveSlot({1:card,2:warriorCards[3]});
  assert.deepEqual(blocked.damageTaken,{1:0,2:2});
  assert.equal(blocked.riposteTriggered[1],true);
  const triggered=resolveSlot({1:card,2:warriorCards[9]});
  assert.deepEqual(triggered.damageTaken,{1:2,2:2});
  assert.equal(triggered.riposteTriggered[1],true);
  assert.deepEqual(resolveSlot({1:card,2:monkCards[4]}).damageTaken,{1:0,2:0});
 }
 const arrow=resolveSlot({1:monkCards[9],2:warriorCards[0]});
 assert.equal(arrow.riposteTriggered[1],false);
 assert.deepEqual(arrow.outgoing[1],{damage:0,defense:0});
 const activated=resolveSlot({1:monkCards[9],2:warriorCards[3]});
 assert.equal(activated.riposteTriggered[1],true);
 assert.deepEqual(activated.outgoing[1],{damage:0,defense:4});
 assert.equal(resolveSlot({1:monkCards[0],2:warriorCards[9]},activated.outgoing).damageTaken[1],0);
 assert.deepEqual(resolveSlot({1:monkCards[9],2:warriorCards[6]}).outgoing,emptyBonuses());
});

test("Deflect cancels all received damage, including an incoming arrow; stun suppresses it",()=>{
 const incoming=emptyBonuses(); incoming[2].damage=2;
 const blocked=resolveSlot({1:monkCards[6],2:warriorCards[9]},incoming);
 assert.deepEqual(blocked.damageTaken,{1:0,2:0});
 assert.deepEqual(blocked.deflected,{1:5,2:0});
 const stunned=resolveSlot({1:monkCards[6],2:warriorCards[6]},incoming);
 assert.equal(stunned.damageTaken[1],2);
 assert.deepEqual(stunned.deflected,{1:0,2:0});
});

test("Reflect prevents and returns damage, respects both defenses and is suppressed by stun",()=>{
 const attack={...warriorCards[9],effects:[{kind:"damage",amount:3,slot:"current"},{kind:"defense",amount:2,slot:"current"}]};
 const reflected=resolveSlot({1:monkCards[8],2:attack});
 assert.deepEqual(reflected.damageTaken,{1:0,2:1});
 assert.deepEqual(reflected.reflected,{1:3,2:0});
 const incoming=emptyBonuses(); incoming[1].defense=1;
 const defended=resolveSlot({1:monkCards[8],2:warriorCards[9]},incoming);
 assert.deepEqual(defended.damageTaken,{1:0,2:2});
 assert.deepEqual(defended.reflected,{1:2,2:0});
 incoming[2].damage=2;
 const stunned=resolveSlot({1:monkCards[8],2:warriorCards[6]},incoming);
 assert.deepEqual(stunned.damageTaken,{1:1,2:0});
 assert.deepEqual(stunned.reflected,{1:0,2:0});
});

test("Reflect versus Deflect ends without damage; two Reflects execute once each without loops or player priority",()=>{
 const incoming=emptyBonuses(); incoming[1].damage=3;
 const deflected=resolveSlot({1:monkCards[6],2:monkCards[8]},incoming);
 assert.deepEqual(deflected.damageTaken,{1:0,2:0});
 assert.deepEqual(deflected.reflected,{1:0,2:3});
 assert.deepEqual(deflected.deflected,{1:3,2:0});
 const twice=resolveSlot({1:monkCards[8],2:monkCards[8]},incoming);
 assert.deepEqual(twice.reflected,{1:3,2:3});
 assert.deepEqual(twice.damageTaken,{1:0,2:3});
 const swapped=emptyBonuses(); swapped[2].damage=3;
 assert.deepEqual(resolveSlot({1:monkCards[8],2:monkCards[8]},swapped).damageTaken,{1:3,2:0});
});

test("previous-slot reflection prevents even lethal damage before life is deducted and never wraps rounds",()=>{
 const slots={1:["monk-1-1","monk-1-9",null,null,null],2:["J","A",null,null,null]};
 const battle=resolveBattle(slots,{1:1,2:3});
 assert.deepEqual(battle.life,{1:1,2:0});
 assert.deepEqual(battle.result,{type:"win",winner:1});
 assert.equal(battle.log.length,1);
 assert.equal(battle.log[0].reflected[1],3);
 // Stun at the source slot cancels that card's reflection of both slots.
 const suppressed=resolveBattle({...slots,2:["J","G",null,null,null]},{1:1,2:3});
 assert.deepEqual(suppressed.result,{type:"win",winner:2});
 // Stun in the earlier slot cannot remove a bonus supplied by a different card.
 const incoming=resolveBattle({1:["monk-1-3","monk-1-1","monk-1-9",null,null],2:["F","G","A",null,null]},{1:10,2:10});
 assert.equal(incoming.log[1].damage[2],1);
 assert.equal(incoming.log[1].stunned[1],true);
 assert.equal(incoming.log[1].damageTaken[1],0);
 assert.equal(incoming.log[1].reflected[1],1);
 const first=resolveBattle({1:["monk-1-9",null,null,null,"monk-1-1"],2:["J",null,null,null,"D"]},{1:10,2:10});
 assert.deepEqual(first.life,{1:9,2:7});
 assert.equal(first.log[4].reflected[1],0);
});

test("both slots covered by Reflect apply to actual attacks and prevent a conditional outgoing riposte",()=>{
 const battle=resolveBattle({1:["monk-1-10","monk-1-9",null,null,null],2:["D","J",null,null,null]},{1:10,2:10});
 assert.deepEqual(battle.life,{1:10,2:6});
 assert.equal(battle.log[0].riposteTriggered[1],false);
 assert.deepEqual(battle.log[0].outgoing[1],{damage:0,defense:0});
 assert.equal(battle.log[0].reflected[1],1);
 assert.equal(battle.log[1].reflected[1],3);
});

test("server persists independent decks, rejects foreign cards and prevents switching during a match",()=>{
 let state = applyAction(newGame(),1,{type:"select_deck",deck:"monk"});
 assert.deepEqual(state.decks,{1:"monk",2:"warrior"});
 assert.deepEqual(roomView(state,"spectator",1).decks,state.decks);
 assert.throws(()=>applyAction(state,1,{type:"select_deck",deck:"unknown"}),/inválido/);
 assert.throws(()=>applyAction(state,"spectator",{type:"select_deck",deck:"monk"}),/Espectadores/);
 assert.throws(()=>applyAction(state,1,{type:"place",slot:0,card:"1"}),/não pertence/);
 assert.throws(()=>applyAction(state,2,{type:"place",slot:0,card:"monk-1-1"}),/não pertence/);
 state = applyAction(state,1,{type:"place",slot:0,card:"monk-1-1"});
 assert.throws(()=>applyAction(state,1,{type:"select_deck",deck:"warrior"}),/início/);
 assert.deepEqual(applyAction(state,1,{type:"select_deck",deck:"monk"}),state);
 assert.equal(normalizeGameState({...newGame(),decks:undefined}).decks[1],"warrior");
});

test("Monk mandatory cards, public fatigue, recovery and deck selection survive rounds and restart",()=>{
 let state = applyAction(newGame(),1,{type:"select_deck",deck:"monk"});
 const place=(player,cards)=>{ for(const [slot,card] of cards.entries()) state=applyAction(state,player,{type:"place",slot,card}); };
 place(1,["monk-1-3","monk-1-4","monk-1-5","monk-1-6","monk-1-7"]);
 assert.throws(()=>applyAction(state,1,{type:"ready"}),/obrigatórias/);
 place(1,Array(5).fill(null));
 place(1,["monk-1-1","monk-1-2","monk-1-7","monk-1-8","monk-1-10"]);
 place(2,["A","B","C","D","E"]);
 state=applyAction(state,1,{type:"ready"}); state=applyAction(state,2,{type:"ready"});
 assert.deepEqual(roomView(state,"spectator",1).fatigue[0].cards.map(card=>[card.card,card.availableRound]),[["monk-1-7",4],["monk-1-8",3],["monk-1-10",4]]);
 state=advanceRound(state);
 assert.deepEqual(state.decks,{1:"monk",2:"warrior"});
 assert.equal(availableCardsFor(state,1).length,7);
 assert.throws(()=>applyAction(state,1,{type:"place",slot:0,card:"monk-1-7"}),/Fadiga/);
 assert.throws(()=>applyAction(state,1,{type:"select_deck",deck:"warrior"}),/início/);
 state.life={1:0,2:3}; state.result={type:"win",winner:2};
 state=applyAction(state,1,{type:"restart"});
 assert.deepEqual(state.decks,{1:"monk",2:"warrior"});
 assert.equal(availableCardsFor(state,1).length,10);
 assert.deepEqual(state.life,{1:10,2:10});
 state=applyAction(state,1,{type:"select_deck",deck:"warrior"});
 assert.equal(state.decks[1],"warrior");
});
