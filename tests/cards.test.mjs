import { test } from "node:test";
import assert from "node:assert/strict";
import { warriorCards, deckFor, definitionFor, warriorRulePolicy, nextAvailableRound, validateDeck, isMandatoryCard } from "../lib/cards.ts";

test("warrior deck matches all ten cards in the reference, including duplicates and separators", () => {
 assert.equal(warriorCards.length, 10);
 assert.equal(new Set(warriorCards.map(card => card.id)).size, 10);
 assert.deepEqual(warriorCards.map(card => [...card.text.main, ...card.text.footer]), [
  ["Não age"], ["Não age"], ["+1 def"], ["+1 dano"], ["+2 dano", "Ripostar"],
  ["+1 dano → +1 dano"], ["Atordoamento", "(Fadiga 1)"],
  ["+3 dano", "Ripostar", "(Fadiga 1)"], ["+1 def → +1 def", "(Fadiga 2)"], ["+3 dano", "(Fadiga 2)"],
 ]);
 assert.deepEqual(deckFor(1).map(card => card.definitionId), deckFor(2).map(card => card.definitionId));
 assert.deepEqual(definitionFor(1,"5"), definitionFor(2,"E"));
 assert.equal(definitionFor(2,"J").id,"warrior-10");
 assert.equal(definitionFor(1,"A"),undefined);
});
test("confirmed meanings are stored independently of displayed text", () => {
 assert.equal(warriorCards[4].damageCondition,"opponent_deals_damage");
 assert.deepEqual(warriorCards[5].effects,[{kind:"damage",amount:1,slot:"current"},{kind:"damage",amount:1,slot:"next"}]);
 assert.deepEqual(warriorCards[6].effects,[{kind:"stun",target:"opposing_card_same_slot"}]);
 assert.equal(warriorCards[7].fatigue.rounds,1);
 assert.equal(warriorCards[8].effects[1].slot,"next");
 assert.equal(warriorCards[9].fatigue.rounds,2);
 assert.equal(nextAvailableRound(warriorCards[6],1),3);
 assert.equal(nextAvailableRound(warriorCards[9],1),4);
 assert.equal(warriorRulePolicy.nextSlotOverflow,"discard");
 assert.equal(warriorRulePolicy.riposte.requires,"actual_opponent_damage");
 assert.equal(warriorRulePolicy.riposte.againstRiposte,"no_effect");
});

test("every registered deck requires No action cards without fatigue", () => {
 assert.doesNotThrow(()=>validateDeck(warriorCards));
 assert.throws(()=>validateDeck(warriorCards.filter(card=>!isMandatoryCard(card))),/Não age/);
 assert.throws(()=>validateDeck([{...warriorCards[0],fatigue:{rounds:1,reference:"round_placed_and_revealed"}}]),/não podem ter Fadiga/);
 assert.throws(()=>validateDeck(Array(6).fill(warriorCards[0])),/cinco slots/);
 assert.ok(warriorCards.filter(isMandatoryCard).every(card=>!card.fatigue));
});
