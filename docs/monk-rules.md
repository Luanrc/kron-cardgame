# Monge

Dez cartas transcritas da imagem enviada em 27/10/2026. “MA” foi substituído por “slot”. Os dois jogadores podem escolher Monge independentemente; instâncias, campos e Fadiga continuam separados.

| Carta | Efeito | Fadiga |
| --- | --- | --- |
| 01 | Não age, obrigatória em toda rodada | Nenhuma |
| 02 | Não age, obrigatória em toda rodada | Nenhuma |
| 03 | +1 dano | Nenhuma |
| 04 | +1 defesa | Nenhuma |
| 05 | +1 defesa e +2 dano com Ripostar | Nenhuma |
| 06 | +1 defesa e +2 dano com Ripostar | Nenhuma |
| 07 | Defletir: anula todo o dano recebido neste slot | 2 |
| 08 | Atordoamento | 1 |
| 09 | Refletir nos slots anterior e atual: anula e devolve o dano | 2 |
| 10 | Se Ripostar ativar no slot atual: +2 dano e +4 defesa no próximo slot | 2 |

As cartas 05 e 06 são cópias com o mesmo significado, respeitando a separação de texto da referência. Sua defesa funciona mesmo sem Ripostar. Na carta 10, os dois efeitos dependem de Ripostar ativar no slot atual, conforme a correção mais recente do usuário. Atordoamento impede a carta atual e seus efeitos de seta, preservando os bônus vindos de outro slot.

Refletir protege o slot atual e o imediatamente anterior. A proteção do anterior é considerada antes de aplicar dano ou declarar derrota, sem retirar vida para depois curá-la. No primeiro slot não há slot anterior; o efeito não volta à rodada passada.

O dano devolvido respeita defesa, Defletir e Refletir. Defesa é um total por slot: cada ponto absorve apenas um ponto de dano, somando ataques diretos e devolvidos. Defletir anula o dano que restar. Cada jogador pode refletir uma vez por slot, sem ciclo infinito: com dois Refletir e um ataque, o dano vai ao atacante e volta uma vez; ao chegar novamente a quem já refletiu, não é devolvido outra vez. Refletir contra Defletir termina sem dano. Ataques e devoluções são tratados simetricamente antes de atualizar as vidas. Atordoamento na carta Refletir cancela a proteção dos dois slots; Atordoamento na carta do slot anterior não apaga a proteção recebida de outra carta.

O baralho é salvo no estado compartilhado da sala. Pode ser trocado no início de uma partida, antes de colocar suas cartas. Reentrar com o mesmo baralho recupera o estado existente. Nova rodada e Nova partida preservam a classe escolhida; no início da nova partida ela pode ser trocada. Salas antigas continuam com Guerreiro. As duas Não age são verificadas pelo servidor, assim como a propriedade de cada carta e sua Fadiga.
