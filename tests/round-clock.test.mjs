import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, applyAction, expirePreparation, roomView, PREPARATION_MS } from '../lib/game.ts';
import { catalog } from '../lib/cards.ts';
import { createCreature } from '../lib/creatures.ts';
const now=Date.now();
function joined(){let state=applyAction(newGame(),1,{type:'select_deck',deck:'warrior'},now);return applyAction(state,2,{type:'select_deck',deck:'warrior'},now+10);}

test('One shared 70s deadline starts after both deck choices and survives reads, re-entry and placement',()=>{
 let state=applyAction(newGame(),1,{type:'select_deck',deck:'warrior'},now);
 assert.equal(state.preparationStartedAt,null);
 state=applyAction(state,2,{type:'select_deck',deck:'warrior'},now+10);
 assert.equal(state.preparationStartedAt,now+10);assert.equal(PREPARATION_MS,70000);
 state=applyAction(state,1,{type:'select_deck',deck:'warrior'},now+1000);
 state=applyAction(state,1,{type:'place',slot:0,card:'4'},now+2000);
 for(const viewer of [1,2,'spectator']){
  const view=roomView(state,viewer,5,now+3000);
  assert.equal(view.preparationStartedAt,now+10);assert.equal(view.preparationDuration,70000);assert.equal(view.serverNow,now+3000);
 }
 assert.equal(expirePreparation(state,now+70009),state);
});
test('Deadline reveals incomplete fields as idle slots and resolves exactly once',()=>{
 let state=joined();state=applyAction(state,1,{type:'place',slot:0,card:'10'},now+100);
 const resolved=expirePreparation(state,now+70010);
 assert.equal(resolved.timedOut,true);assert.deepEqual(resolved.ready,{1:true,2:true});assert.equal(resolved.life[2],7);
 assert.deepEqual(resolved.slots[1],['10',null,null,null,null]);assert.equal(resolved.fatigue[1]['10'].availableRound,4);
 assert.equal(expirePreparation(resolved,now+80000),resolved);
 assert.throws(()=>applyAction(state,1,{type:'place',slot:1,card:'4'},now+70010),/pronto/);
});
test('Timeout preserves required idle actions by removing the last excessive actions and their plans',()=>{
 let state=joined();
 for(const [slot,card] of ['3','4','5','6','7'].entries())state=applyAction(state,1,{type:'place',slot,card},now+100);
 const resolved=expirePreparation(state,now+70010);
 assert.deepEqual(resolved.slots[1],['3','4','5',null,null]);assert.equal(resolved.fatigue[1]['7'],undefined);
 state=joined();state.noActionOptionalRound[1]=1;
 for(const [slot,card] of ['3','4','5','6','7'].entries())state=applyAction(state,1,{type:'place',slot,card},now+100);
 assert.deepEqual(expirePreparation(state,now+70010).slots[1],['3','4','5','6','7']);
});
test('Timeout never removes persistent creatures to reserve mandatory idle slots',()=>{
 let state=joined();state.decks[1]='summoner';state.life[1]=11;
 state.creatures[1][0]=createCreature(catalog.summoner[3],'summoner-1-4');state.creatures[1][4]=createCreature(catalog.summoner[4],'summoner-1-5');
 for(const [slot,card] of [[1,'summoner-1-3'],[2,'summoner-1-11'],[3,'summoner-1-1']])state=applyAction(state,1,{type:'place',slot,card},now+100);
 const resolved=expirePreparation(state,now+70010);
 assert.equal(resolved.slots[1][2],null);assert.ok(resolved.creatures[1][0]);assert.ok(resolved.creatures[1][4]);
});
test('Only two distinct next-round votes advance the round; a duplicate vote is harmless',()=>{
 const revealed=expirePreparation(joined(),now+70010);
 const first=applyAction(revealed,1,{type:'reset'},now+80000);
 assert.equal(first.round,1);assert.deepEqual(first.nextRoundReady,{1:true,2:false});assert.equal(first.ready[1],true);
 assert.equal(applyAction(first,1,{type:'reset'},now+81000).round,1);
 assert.equal(roomView(first,'spectator',3,now+81000).nextRoundReady[1],true);
 const next=applyAction(first,2,{type:'reset'},now+82000);
 assert.equal(next.round,2);assert.equal(next.preparationStartedAt,now+82000);assert.deepEqual(next.nextRoundReady,{1:false,2:false});
 assert.deepEqual(next.life,revealed.life);assert.deepEqual(next.ready,{1:false,2:false});
});
test('Premonition delays the shared preparation clock until the locked slot is chosen',()=>{
 let state=expirePreparation(joined(),now+70010);state.visions[1]={round:2,slot:null};
 state=applyAction(state,1,{type:'reset'},now+80000);state=applyAction(state,2,{type:'reset'},now+80000);
 assert.equal(state.preparationStartedAt,null);
 state=applyAction(state,2,{type:'foretell',slot:4},now+90000);
 assert.equal(state.preparationStartedAt,now+90000);assert.equal(state.slots[2][4],'A');
});
test('Concealed fortification is indistinguishable from an unmodified public creature',()=>{
 let state=applyAction(newGame(),1,{type:'select_deck',deck:'summoner'},now);
 state.creatures[1][2]=createCreature(catalog.summoner[3],'summoner-1-4');
 const before=roomView(state,'spectator',1,now);
 state=applyAction(state,1,{type:'place',slot:2,card:'summoner-1-8'},now+100);
 for(const viewer of [1,2,'spectator']){
  const view=roomView(state,viewer,2,now+100);
  assert.equal(view.fields[0].slots[2],null);assert.deepEqual(view.creatures,before.creatures);
 }
 assert.equal(roomView(state,1,2,now+100).ownSlots[2],'summoner-1-8');
});
test('Legacy Bears lose riposte without losing their buffs, damage or health',()=>{
 const state=joined();state.creatures[1][0]={...createCreature(catalog.summoner[4],'summoner-1-5'),riposte:true,life:2,damage:3};
 const view=roomView(state,1,1,now+1);assert.equal(view.creatures[1][0].riposte,false);assert.equal(view.creatures[1][0].life,2);assert.equal(view.creatures[1][0].damage,3);
});
test('Legacy Barbarian life migrates once while preserving previous damage',()=>{
 const legacy=newGame();legacy.decks[1]='barbarian';legacy.life[1]=8;delete legacy.entered;
 const view=roomView(legacy,1,1,now);assert.equal(view.life[1],6);assert.equal(view.initialLife[1],9);
 const fresh=applyAction(newGame(),1,{type:'select_deck',deck:'barbarian'},now);assert.equal(roomView(fresh,1,1,now).life[1],9);
});
