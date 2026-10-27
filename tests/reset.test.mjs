import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, resetMatch, normalizeGameState, applyAction } from "../lib/game.ts";

test("Lobby reset clears both players' decks, resources, effects and plans even during a live match",()=>{
 const state=newGame(6,9);state.lobbyReset=3;
 state.decks={1:"paladin",2:"rogue"};state.life={1:4,2:8};
 state.holyPower={1:12,2:0};state.holySpending[1]["paladin-1-7"]=6;
 state.floating[2]["rogue-2-9"]=[1,2];state.bleeding[1][2]=4;
 state.fatigue[2]["rogue-2-10"]={usedRound:5,availableRound:8};
 state.slots[1][0]="paladin-1-1";state.slots[2][0]="rogue-2-1";
 state.ready[1]=true;
 const reset=resetMatch(state);
 assert.deepEqual(reset,{...newGame(1,10),lobbyReset:4});
 assert.equal(state.life[1],4,"reset must not mutate the previous state");
 state.result={type:"win",winner:2};
 assert.deepEqual(resetMatch(state),reset);
});

test("Only a lobby reset changes its signal; ordinary rounds and match restarts keep it",()=>{
 let state=newGame();state.lobbyReset=4;state.ready={1:true,2:true};
 state=applyAction(state,1,{type:"reset"});assert.equal(state.lobbyReset,4);
 state.result={type:"win",winner:1};state.life={1:5,2:0};
 state=applyAction(state,1,{type:"restart"});assert.equal(state.lobbyReset,4);
 assert.equal(normalizeGameState({...newGame(),lobbyReset:undefined}).lobbyReset,0);
});
