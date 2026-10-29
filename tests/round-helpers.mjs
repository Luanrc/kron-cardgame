import { applyAction } from '../lib/game.ts';
export function advanceRound(state) {
 const vote=applyAction(state,1,{type:'reset'});
 return applyAction(vote,2,{type:'reset'});
}
