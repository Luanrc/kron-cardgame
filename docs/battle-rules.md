# Combate e reserva de vida

Cada jogador começa com 10 de vida. Toda resolução acontece no servidor, na mesma escrita com controle de versão que confirma o segundo Pronto. Clientes e espectadores apenas recebem o estado e o registro público. Consultar a sala ou repetir uma confirmação nunca aplica dano novamente.

## Por slot, do 1 ao 5

1. Receber os bônus trazidos pelo slot anterior.
2. Identificar Atordoamento. Ele bloqueia somente a carta adversária atual, inclusive seus efeitos de seta. Não apaga bônus recebidos do slot anterior. Dois Atordoamentos bloqueiam ambas as cartas.
3. Somar defesa e dano normal das cartas ativas aos bônus recebidos.
4. Ativar Ripostar apenas se o dano normal adversário ultrapassar a defesa do jogador. Duas cartas de Ripostar não ativam uma à outra. Bônus anteriores continuam existindo independentemente da reação.
5. Calcular o dano nos dois sentidos: max(0, danoAdversário - defesaPrópria). Ataques não se anulam entre si; defesa excedente não causa dano nem cura.
6. Reduzir simultaneamente as duas reservas de vida, limitando-as a zero.
7. Se ambos chegaram a zero neste slot, empate. Se apenas um chegou, o outro vence. Não resolver slots posteriores ao fim da partida.
8. Caso a partida continue, os efeitos de seta das cartas ativas seguem apenas para o próximo slot. Os efeitos seguintes ao slot 5 são descartados.

O dano de Ripostar também participa da aplicação simultânea do slot: a derrota só é checada depois dos dois valores de vida serem atualizados.

## Rodadas e Fadiga

O avanço para Nova rodada preserva a vida e a Fadiga, limpa os slots e o registro de confrontos da rodada anterior. Toda carta colocada/revelada recebe sua Fadiga, mesmo sem gerar dano ou em um slot posterior ao encerramento: o critério confirmado para Fadiga é a colocação/revelação da carta.

Após derrota ou empate, colocar cartas, confirmar e avançar rodada é proibido. Nova partida restaura 10/10, limpa a Fadiga, volta à rodada 1 e incrementa match. A API exige match e round em cada ação para rejeitar pedidos atrasados, inclusive quando duas partidas diferentes estão na rodada 1.

## Compatibilidade

Uma sala salva sem os campos de combate recebe vida 10/10, resultado nulo e registro vazio. Rodadas já reveladas não têm dano aplicado retroativamente. A próxima revelação executa o combate normalmente.

lib/battle.ts contém funções puras de confronto e resolução. lib/game.ts gerencia o ciclo da partida, confirmação única e persistência. A vida pertence ao jogador; não pertence à carta ou ao baralho.
