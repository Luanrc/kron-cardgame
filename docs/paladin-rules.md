# Paladino

Dez cartas da imagem do usuário. A segunda imagem foi usada como contexto de implementação; sua explicação da classe não foi adicionada à interface. As confirmações posteriores do usuário prevalecem sobre a referência: X depende do gasto escolhido, e a defesa flutuada pode atingir apenas o slot atual ou o seguinte.

| Carta | Efeito | Fadiga |
| --- | --- | --- |
| 01 e 02 | Não age, ambas obrigatórias | Nenhuma |
| 03 e 04 | +1 dano; ganha +1 Poder Sagrado se causar dano | Nenhuma |
| 05 e 06 | +1 defesa; ganha +1 Poder Sagrado se bloquear dano | Nenhuma |
| 07 | +X dano, com gasto escolhido de Poder Sagrado | 1 |
| 08 | +4 Poder Sagrado | 2 |
| 09 | +3 defesa atual e +3 no próximo slot | 2 |
| 10 | +X defesa, aplicada inteira no slot atual ou seguinte | 2 |

## Recurso e êxito

Cada jogador começa a partida com zero de Poder Sagrado. O recurso pertence ao jogador, acumula entre rodadas e é reiniciado ao começar outra partida. Ganhos e saldo real são públicos; gastos planejados ficam privados até a revelação.

Ataques de geração precisam causar dano real da própria carta ao adversário. Defesa, Defletir, Refletir ou Atordoamento que impeçam esse dano também impedem a geração. Um bônus vindo de outra carta não é atribuído ao ataque atual. A defesa de geração precisa absorver pelo menos um ponto de dano, inclusive Sangramento; defesa sem ser utilizada não gera recurso. A defesa própria da carta é creditada antes de defesas adicionais para determinar esse êxito. A carta 08 gera quatro pontos quando age. Atordoamento impede geração e gasto da carta atual; efeitos já enviados por outra carta continuam válidos.

Pontos obtidos em um slot ficam disponíveis para cartas de slots posteriores da mesma rodada. O cálculo é sequencial, com confronto simultâneo nos dois sentidos de cada slot. Slots posteriores ao fim da partida não geram nem gastam recurso.

## Escolha do gasto

O jogador escolhe e salva o gasto antes de Pronto. Gastar 6 pontos produz X = 3 e desconta 6 do saldo. X é sempre metade do gasto efetivo, arredondada para baixo. Gastar 5 produz X = 2 e desconta 5; gastar 0 é permitido. O restante é preservado.

A interface mostra o saldo atual e um limite possível que inclui ganhos potenciais das próprias cartas anteriores. Esse limite não consulta cartas ocultas do adversário. Se os ganhos não se confirmarem, o gasto é limitado ao saldo real no slot de origem, e X usa esse gasto efetivo. O registro de combate mostra os ganhos, o gasto real e o X resultante. O custo de uma carta que age é pago mesmo se seu ataque for bloqueado ou sua defesa não for necessária; uma carta atordoada não age nem paga.

Só uma carta com X pode ocupar o campo de cada jogador por rodada, mesmo com gasto zero. A regra é validada na colocação e novamente em Pronto. Substituir uma carta com X pela outra no mesmo slot é permitido. Retirar uma carta remove seu plano de gasto; alterar cartas anteriores pode reduzir o limite disponível e ajustar o gasto salvo.

## Defesa com Flutuando

A carta 10 usa o saldo do seu próprio slot e direciona toda a defesa para o slot atual ou o seguinte. Não pode aplicar defesa a um slot anterior. Essa alteração foi escolhida explicitamente pelo usuário para evitar dependência circular entre defesa retroativa e geração de Poder Sagrado. Flutuando do Ladino mantém o alcance original para ambos os lados.

Se a defesa vai para o próximo slot, o valor é calculado e o custo pago na origem; Atordoamento na origem cancela ambos. Atordoamento no destino não remove a defesa já enviada. No slot 5, só é possível escolher o próprio slot. A carta 09 mantém a seta normal: seu bônus seguinte é descartado quando jogada no slot 5.

## Estado e compatibilidade

`holyPower` guarda o saldo de cada jogador; `holySpending` guarda o valor escolhido por carta colocada. Nova rodada preserva saldos e limpa os planos; Nova partida limpa ambos. Salas antigas recebem zero e planos vazios, sem recalcular confrontos já revelados. A API mantém controle de versão e rejeita ações de rodada ou partida anteriores. Gastos de outro jogador e espectadores não são aceitos.

Catálogo em `lib/cards.ts`; cálculo e validação do gasto em `lib/holy-power.ts`; combate em `lib/battle.ts`; estado e sigilo em `lib/game.ts`; controles em `components/holy-power-panel.tsx`. O saldo aparece junto da vida, e os eventos de recurso aparecem no registro de confrontos. Nenhuma introdução ou painel de contexto da classe foi criado.

Testes: `node --test tests/paladin.test.mjs`. Integração apenas no banco local: `node tests/paladin.integration.mjs`, começando com partida nova e campos vazios. Verifica geração condicionada, gasto privado, uso na mesma rodada, persistência, limite de uma carta com X e defesa apenas atual/seguinte.
