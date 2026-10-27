# Kron Card Game

Protótipo 0.9 de um cardgame online 1v1. Este diretório é o projeto do game; não confundir com Kron RPG.

Entrada dos jogadores em três etapas: escolher Player 1 ou Player 2, selecionar o baralho e confirmar Entrar na sala. Por enquanto, Guerreiro é a única opção e usa o catálogo já compartilhado pelos dois jogadores. Voltar permite trocar de jogador; Sair retorna ao início. A conexão com a sala começa somente após confirmar o baralho. Espectador entra diretamente na sala, sem escolher baralho. A escolha ainda é local; o servidor mantém o único baralho de Guerreiro existente.

Combate e vida ativos: cada jogador começa com 10 de vida, preservada entre rodadas. O servidor resolve os slots 1 a 5 quando ambos confirmam Pronto, com defesa absorvendo dano 1:1 e ataques simultâneos em cada slot. Vida nunca fica negativa. O primeiro slot letal encerra a partida; ambos a zero no mesmo slot é empate. Há registro público de dano e vida após cada slot, Atordoamento e Ripostas ativadas. Jogadas e Nova rodada ficam bloqueadas após o fim; Nova partida restaura vida e cartas, limpa Fadiga e incrementa a identidade da partida. Pedidos atrasados de outra partida são rejeitados pelo servidor.

Partidas salvas sem vida recebem 10/10. Rodadas já reveladas antes desta versão não causam dano retroativo; o combate começa na próxima revelação. Recarregar ou consultar a sala não recalcula o dano. Regras de resolução em docs/battle-rules.md e código puro em lib/battle.ts.

Toda carta com efeito no_action (Não age) é obrigatória em cada rodada e nunca fica em Fadiga. O Guerreiro possui duas cópias distintas: ambas precisam ocupar slots, em posições livres. Pronto só é autorizado pelo servidor com as cinco cartas e todas as obrigatórias. validateDeck exige pelo menos uma Não age por baralho, impede Fadiga nessas cartas e limita as obrigatórias aos cinco slots.

Fadiga está ativa: ao revelar os dois campos, cartas com Fadiga registram sua rodada de uso e a rodada em que podem voltar. Não aparecem na mão durante as rodadas bloqueadas e o servidor rejeita colocá-las. Nova rodada preserva a Fadiga e recupera automaticamente as cartas elegíveis. Fadiga 1 usada na rodada 1 retorna na 3; Fadiga 2 retorna na 4. A área Cartas em Fadiga mostra os dois lados, identidade, rodadas restantes e rodada de retorno para todos, inclusive espectadores. Os valores nunca são publicados antes da revelação que gera essa Fadiga.

Estados anteriores são normalizados sem apagar os campos: uma rodada antiga já revelada ganha os registros de Fadiga de suas cartas; se estava em preparação, uma confirmação antiga sem todas as Não age é desfeita para permitir corrigir. Nenhuma alteração de schema SQL é necessária: o estado da sala já é JSON.

Baralho de Guerreiro: dez definições em lib/cards.ts, transcritas da imagem do usuário em 27/10/2026, replicadas para ambos os jogadores. Textos visíveis em components/card-text.tsx e na ampliação. As duas cartas Não age têm IDs distintos. Definição compartilhada (texto e efeitos) é separada da instância de cada jogador. IDs internos anteriores 1–10 e A–J são preservados para manter rodadas salvas; os dois lados agora exibem Guerreiro 01–10 com os mesmos textos.

As regras de colocação, obrigatoriedade, revelação, Fadiga e combate são executadas. A seta seguinte ao slot 5 é descartada; Ripostar exige dano real do oponente e não ativa contra outra Riposta; Atordoamento bloqueia a carta oposta do mesmo slot, preservando bônus já trazidos do slot anterior. Dano e defesa são comparados por slot, e a vida é reduzida simultaneamente nos dois sentidos. Detalhes em docs/warrior-rules.md e docs/battle-rules.md.

Mouse over nas cartas: prévia ampliada da mão e de cartas ocupando slots, inclusive no modo Espectador. A prévia aparece ao lado sem alterar o campo e sem ser cortada pelo contêiner; cartas ocultas continuam ocultas. Foco de teclado também abre a prévia. Sair da carta, perder foco, pressionar Escape ou rolar fecha a prévia. Slots vazios não ampliam. Nenhuma mudança nas regras ou no estado compartilhado.

Entrada Espectador: acompanha a mesma sala, com Player 2 em cima e Player 1 embaixo. Não recebe mão e não tem ações de jogo, Pronto ou Nova rodada. Vê cartas viradas para baixo até ambos estarem prontos; depois vê os valores revelados. A API também omite mãos da visão de espectador e rejeita ações enviadas nessa função. Atualiza a cada segundo como os jogadores.

Campo de batalha: cinco slots por jogador, em duas fileiras com as mesmas cinco colunas. Slot 1 fica diante do slot 1, até 5. O jogador local aparece embaixo; o oponente, em cima. Em telas estreitas, o campo rola horizontalmente sem quebrar o alinhamento.

Sem login ou arte. Cada jogador começa com as dez cartas de Guerreiro e escolhe cinco cartas únicas para distribuir nos slots. Clique na carta e depois no slot; um slot ocupado pode ser esvaziado sem carta selecionada. As cartas no campo permanecem viradas para baixo, inclusive para o dono; a mão indica onde cada carta foi colocada.

Pronto só aparece com os cinco slots preenchidos e todas as Não age, e trava a escolha daquele jogador. O servidor revela os dois campos quando ambos estão prontos. Nova rodada, disponível após a revelação, limpa os slots e devolve apenas as cartas sem Fadiga ativa. Hello World removido da interface e da API.

Estado compartilhado no servidor com Cloudflare D1. Atualização a cada segundo e reconexão automática. Controle de versão na escrita evita perder ações simultâneas; o número da rodada impede aplicar pedidos atrasados à rodada seguinte. Respostas anteriores à revelação não incluem os valores das cartas do oponente. A escolha de jogador continua livre, sem autenticação ou reserva de vaga nesta versão. Recarregar a página retorna à escolha de jogador; escolher o mesmo jogador recupera seu estado.

Fonte em app/, lib/game.ts e db/. Hospedagem Sites, identidade em .openai/hosting.json e migrações em drizzle/. Migrações anteriores preservadas; a tabela legada messages não é mais usada. Nunca salvar credenciais no repositório.

Testes de regras, combate e catálogo: node --test tests/game.test.mjs tests/cards.test.mjs tests/battle.test.mjs. Integração com o servidor local na porta 8787: node tests/room.integration.mjs (somente banco local; começar com sala vazia, revelada ou encerrada). O teste percorre uma partida até o fim, verifica dano único, vida persistida, empate/vitória e rejeição de pedidos de partidas anteriores. Conferência manual: dois clientes, cinco cartas de cada lado, primeiro Pronto sem revelar, segundo Pronto revelando e aplicando dano; Nova rodada preserva vida e Fadiga; Nova partida só após o fim.
