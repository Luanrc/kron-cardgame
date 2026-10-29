# Invocador — implementação local

Baralho de 11 cartas e 11 de vida. As cartas de regra da imagem são explicações, sem instâncias jogáveis. A defesa simples foi adicionada conforme pedido.

## Criaturas e campo

- Lobo: 2 de vida, 1 de dano; carta de invocação com Fadiga 1.
- Urso: 3 de vida, 1 de defesa e 1 de dano com Ripostar; carta de invocação com Fadiga 2.
- A criatura age na rodada em que é invocada e permanece no mesmo slot até morrer. Só um Lobo e um Urso podem estar vivos por jogador. Recuperar a carta de invocação da Fadiga não permite duplicar uma criatura ainda viva.
- Uma criatura residente conta como slot preenchido. Fortalecimento é opcional e só pode ser colocado sobre uma criatura. Outras cartas não podem ocupar aquele slot. Retirar uma carta de fortalecimento durante a preparação não retira a criatura.
- As Não age continuam obrigatórias nos slots livres. Nova rodada preserva criaturas, vida e bônus permanentes; Nova partida e Resetar partida removem todas as criaturas.

## Alvos e combate

Antes de Pronto, cada jogador escolhe por slot se seus ataques atingem o jogador ou a criatura adversária. O padrão é jogador. A escolha fica privada até a revelação e não pode mudar após Pronto. Se não houver criatura no destino, o ataque atinge o jogador.

A defesa e o Ripostar do Urso só valem quando ele próprio é atacado. Dano no dono não os ativa. As ações do confronto são simultâneas: uma criatura morta naquele confronto ainda participa dele. Excesso de dano contra criatura é descartado, sem atingir o dono. Atordoamento impede a ação da criatura no slot, assim como a carta atual; efeitos já trazidos de outros slots são preservados.

Refletir devolve o ataque à sua fonte: um ataque originado pela criatura volta para ela. As defesas e outras regras continuam sendo consideradas, sem reflexão infinita.

## Fortalecimento e Sangramento

Bônus temporários de dano ou defesa duram a rodada atual. Bônus permanentes persistem enquanto a criatura viver. Fortalecer vida aumenta a vida atual e máxima em 1. Fortalecimento atordoado não é aplicado.

Sangramento que acerta uma criatura acompanha a mesma criatura na rodada seguinte e desaparece se ela morrer. Cada marcador causa 1 de dano uma vez e é consumido; defesa pode absorvê-lo, mas ele não é refletido. O marcador só é gerado quando a carta causa dano, conforme a regra comum. O painel da criatura mostra seus marcadores públicos.

## Visibilidade e verificação

Uma nova invocação e os fortalecimentos programados ficam ocultos até ambos confirmarem Pronto. Criaturas já residentes continuam públicas, inclusive para espectadores, mostrando vida, atributos e Sangramento. Os fortalecimentos ocultos não antecipam mudanças nos atributos públicos.

Motor em lib/creatures.ts, lib/battle.ts e lib/game.ts. Testes em tests/summoner.test.mjs e tests/summoner.integration.mjs cobrem combate, persistência, alvos, sigilo, Fadiga, Sangramento, fortalecimento e reinícios. A integração usa somente o D1 local. O envio para a branch staging foi autorizado em 29/10/2026; a publicação do backend continua pendente.
