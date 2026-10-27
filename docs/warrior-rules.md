# Guerreiro: catálogo e futura resolução

## Transcrição

Ordem de leitura da imagem: primeira fileira da esquerda para a direita, depois a segunda fileira. Barras na tabela indicam a divisão horizontal do texto na carta.

| Carta | Texto |
| --- | --- |
| 01 | Não age |
| 02 | Não age |
| 03 | +1 def |
| 04 | +1 dano |
| 05 | +2 dano / Ripostar |
| 06 | +1 dano → +1 dano |
| 07 | Atordoamento / (Fadiga 1) |
| 08 | +3 dano / Ripostar / (Fadiga 1) |
| 09 | +1 def → +1 def / (Fadiga 2) |
| 10 | +3 dano / (Fadiga 2) |

## Organização do código

- lib/cards.ts: definições compartilhadas imutáveis por convenção, com ID estável, classe, ordem, texto de apresentação e efeitos estruturados. Duas cartas com o mesmo texto continuam tendo IDs distintos.
- deckFor(player): instâncias pertencentes a cada jogador que apontam para as mesmas definições. Os tokens internos antigos são preservados para compatibilidade com partidas existentes.
- components/card-text.tsx: apenas apresentação. Não calcula efeitos.
- lib/game.ts: colocação, cartas Não age obrigatórias, confirmação, revelação, persistência e recuperação de Fadiga. A resolução de dano e efeitos de combate ainda não está implementada.
- app/api/room/route.ts: autoridade do estado compartilhado, proteção de cartas ocultas e escrita com controle de versão.

O futuro resolvedor deverá consumir os dados estruturados do catálogo no servidor. Nunca deve extrair números ou palavras do texto renderizado. A mesma definição de Guerreiro pode pertencer aos dois lados; Fadiga e outros estados mutáveis devem pertencer à instância de cada jogador, nunca à definição compartilhada.

Todos os baralhos precisam conter cartas Não age, e todas essas cópias são obrigatórias em cada rodada. Elas não podem ter Fadiga. A regra é derivada do efeito no_action, sem comparação de texto ou IDs fixos. validateDeck valida o contrato do baralho; a confirmação no servidor valida a presença das obrigatórias no campo.

## Significados confirmados pelo usuário

- Ripostar: exige dano real do oponente; intenção de ataque não basta. Ripostar contra Ripostar não produz efeito.
- Atordoamento: impede a carta adversária do mesmo slot de agir.
- Seta: o efeito à direita se aplica ao próximo slot. Se a carta estiver no slot 5, o efeito seguinte é descartado.
- Fadiga X: a carta não age nas X rodadas seguintes ao uso. Fadiga 1 usada na rodada 1 fica indisponível na rodada 2 e volta na 3; Fadiga 2 volta na 4. A referência é a rodada em que as cartas são colocadas/reveladas; não se trata de avançar pelos cinco slots.

warriorRulePolicy registra esses critérios; nextAvailableRound calcula a primeira rodada disponível como rodadaDeUso + fadiga + 1. A colocação e a revelação usam esse cálculo para impedir o retorno antecipado à mão.

## Fadiga pública

O estado da sala salva usedRound e availableRound por instância e jogador. Os registros são criados uma única vez quando ambos ficam prontos. O avanço da rodada preserva os registros e remove os que já podem retornar. Uma carta pode permanecer no campo revelado da rodada em que foi usada e já aparecer na área de Fadiga; a indisponibilidade se aplica às rodadas seguintes.

As rodadas restantes correspondem às rodadas bloqueadas ainda a cumprir: availableRound - max(rodadaAtual, usedRound + 1). Exemplo: Fadiga 2 usada na rodada 1 mostra 2 após o uso e durante a preparação da rodada 2; mostra 1 na rodada 3; desaparece e volta à mão na rodada 4. A mesma lista pública é enviada aos dois jogadores e ao espectador. Não inclui mão ou escolhas ocultas da rodada em preparação.

## Decisões antes de executar o combate

- Definir cálculo de dano contra defesa e ordem de resolução. O protótipo não possui vida ou resultado de combate nesta etapa.

O botão Pronto revela as cartas e registra sua Fadiga; ainda não calcula dano nem resolve Atordoamento, seta ou Ripostar.
