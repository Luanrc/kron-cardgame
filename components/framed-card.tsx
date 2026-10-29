import { classNameFor, isMandatoryCard, type CardDefinition } from "../lib/cards";
import { ClassSymbol } from "./class-symbol";
import { compactCardText } from "../lib/card-presentation";

export function FramedCard({ card }: { card: CardDefinition }) {
 const brief = compactCardText(card);
 const rules: string[] = [...card.text.main, ...card.text.footer].filter(line => !brief.main.includes(line) && !brief.footer.includes(line));
 if (isMandatoryCard(card)) rules.push("Deve ser jogada a cada rodada. Não realiza ações e não recebe Fadiga.");
 if (card.effects.some(effect => effect.kind === "stun")) rules.push("Impede a carta adversária deste slot de agir. Bônus vindos de outro slot são preservados.");
 if (card.damageCondition) rules.push("Ripostar: só causa dano se você sofrer dano neste slot. Duas Ripostas não se ativam.");
 if (card.effects.some(effect => (effect.kind === "damage" || effect.kind === "defense") && effect.slot === "next")) rules.push(card.nextSlotCondition ? "A defesa seguinte só é gerada se Ripostar ativar." : "Após a seta, o efeito vai para o próximo slot. Após o slot 5, é descartado.");
 if (card.effects.some(effect => effect.kind === "deflect")) rules.push("Anula o dano recebido neste slot.");
 if (card.effects.some(effect => effect.kind === "reflect")) rules.push("Anula e devolve o dano ofensivo dos slots anterior e atual, respeitando as defesas do adversário.");
 if (card.fatigue) rules.push(`Fica indisponível por ${card.fatigue.rounds} ${card.fatigue.rounds === 1 ? "rodada" : "rodadas"} após o uso.`);
 return <span className="framed-card">
  <span className="framed-title"><strong>{classNameFor(card.classId)} {String(card.number).padStart(2, "0")}</strong><ClassSymbol deck={card.classId} size={18} /></span>
  <span className="framed-art">Espaço para arte</span>
  <span className="framed-type">{classNameFor(card.classId)}<span>{isMandatoryCard(card) ? "Não age" : "Ação"}</span></span>
  <span className="framed-rules"><strong>{brief.main.join(" · ")}</strong>{brief.footer.length > 0 && <span className="framed-keywords">{brief.footer.join(" · ")}</span>}{rules.map(rule => <span key={rule}>{rule}</span>)}</span>
  <span className="framed-bottom">KRON CARD GAME <span>{String(card.number).padStart(2, "0")}</span></span>
 </span>;
}
