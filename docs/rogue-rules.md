# Ladino

Baralho de dez cartas transcrito da imagem do usuário, com MA apresentado como slot.

| Carta | Efeito | Fadiga |
| --- | --- | --- |
| 01 e 02 | Não age, ambas obrigatórias | Nenhuma |
| 03 e 04 | +1 dano e Sangramento | Nenhuma |
| 05 | +1 defesa | Nenhuma |
| 06 | Atordoamento | 1 |
| 07 | +1 dano agora, +1 dano no próximo slot; Sangramento apenas no atual | 1 |
| 08 | +1 defesa agora e no próximo slot | 2 |
| 09 | +2 dano, divisível, Flutuando 1 | Nenhuma |
| 10 | +1 dano atual; Sangramento com Flutuando 3, adicionando 1 marcador e dobrando o total no destino | 2 |

## Sangramento

Um marcador pertence ao slot do jogador atingido, não à carta. Causa 1 de dano somente na rodada seguinte e desaparece mesmo se bloqueado. Defesa e Defletir podem bloquear; Refletir não bloqueia nem devolve Sangramento. Atordoar a carta atual não cancela marcadores vindos da rodada anterior.

O Sangramento novo exige dano real causado pela própria carta ao adversário. Um ataque inteiramente bloqueado, defletido ou devolvido ao atacante não gera marcador. Dano causado por um bônus de outra carta ou pelo Sangramento anterior não é atribuído à carta atual. Por isso o resolvedor acompanha a origem dos pacotes de dano, em vez de consultar apenas o total perdido de vida. Na carta 07, a seta não aplica Sangramento no slot seguinte, conforme a última confirmação do usuário.

Critério adotado para fontes simultâneas: a defesa é consumida primeiro pelo Sangramento pendente, depois pelo ataque da carta e pelos demais bônus; cada ponto de defesa absorve apenas um ponto de dano no slot inteiro. Todos os danos finais são aplicados às vidas simultaneamente. Essa ordem de absorção importa quando Refletir e Sangramento coexistem.

Na carta 10, o dano permanece no slot da carta. Se esse dano atingir o adversário, o slot escolhido recebe 1 marcador novo e o total de marcadores agendados ali para a próxima rodada é dobrado. Marcadores já consumidos na rodada atual não são recuperados nem prolongados. Exemplo: 1 marcador novo anterior + 1 da carta 10, multiplicados por 2, produzem 4 na próxima rodada. Se a carta 10 não causar dano, não adiciona nem duplica marcadores.

## Flutuando

Flutuando X alcança o slot de origem e até X posições à esquerda ou à direita, limitado aos slots 1–5 e sem passar entre rodadas. O usuário escolhe antes de Pronto. Cada ponto inteiro de dano da carta 09 tem um seletor próprio; ambos podem ficar no mesmo destino ou ser divididos. A carta 10 tem um seletor para o Sangramento, sem mover o dano.

Ao colocar a carta, a distribuição começa no próprio slot. Os seletores salvam no servidor, sobrevivem a recarregamento e ficam travados depois de Pronto. Retirar ou substituir a carta remove seu plano. Recolocá-la inicia uma nova distribuição no novo slot. O servidor valida a carta colocada, propriedade, quantidade de pontos, inteiros e alcance; Pronto rejeita planos ausentes ou inválidos.

Os efeitos escolhidos entram nos slots de destino na resolução, inclusive destinos anteriores ao slot de origem. Atordoamento na origem cancela os efeitos da carta inteira, inclusive os distribuídos; Atordoamento no destino cancela somente a carta daquele destino, preservando os efeitos de outras cartas. Defesa, Defletir e Refletir continuam funcionando normalmente contra dano distribuído.

## Persistência e visibilidade

`bleeding` armazena cinco contadores por jogador. Durante a preparação, são os marcadores que causarão dano nesta rodada; após a revelação, passam a ser os recém-gerados para a próxima rodada. `bleedingRound` torna essa referência explícita na interface. Nova rodada preserva os contadores e limpa a distribuição de Flutuando; Nova partida limpa ambos. Estados antigos recebem contadores e planos vazios, sem recalcular batalhas já reveladas.

Os marcadores e sua rodada de aplicação são públicos e aparecem nos retângulos, inclusive vazios. Planos de Flutuando permanecem privados para o dono durante a preparação; a API não envia os planos adversários ao outro jogador ou ao espectador. Depois da revelação, os destinos são públicos, junto com o registro de dano, marcadores gerados e duplicações.

Código: `lib/cards.ts` contém o catálogo; `lib/targeting.ts` valida destinos; `lib/battle.ts` resolve pacotes de dano, Sangramento e distribuição; `lib/game.ts` controla o ciclo e a privacidade; `components/floating-panel.tsx` apresenta os seletores e o resumo público.

Testes: `node --test tests/rogue.test.mjs`. Integração apenas no banco local: `node tests/rogue.integration.mjs`, começando com partida nova e campos vazios. Verifica duas rodadas de dano, marcadores duplicados, imunidade a Refletir, sigilo, alcance, planos travados, expiração e reinício.
