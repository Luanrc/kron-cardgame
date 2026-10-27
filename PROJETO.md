# Kron Card Game

Protótipo 0.4 de um cardgame online 1v1. Este diretório é o projeto do game; não confundir com Kron RPG.

Entrada Espectador: acompanha a mesma sala, com Player 2 em cima e Player 1 embaixo. Não recebe mão e não tem ações de jogo, Pronto ou Nova rodada. Vê cartas viradas para baixo até ambos estarem prontos; depois vê os valores revelados. A API também omite mãos da visão de espectador e rejeita ações enviadas nessa função. Atualiza a cada segundo como os jogadores.

Campo de batalha: cinco slots por jogador, em duas fileiras com as mesmas cinco colunas. Slot 1 fica diante do slot 1, até 5. O jogador local aparece embaixo; o oponente, em cima. Em telas estreitas, o campo rola horizontalmente sem quebrar o alinhamento.

Sem login ou arte. Player 1 começa com cartas de 1 a 10; Player 2, de A a J. Cada um escolhe cinco cartas únicas e distribui nos slots. Clique na carta e depois no slot; um slot ocupado pode ser esvaziado sem carta selecionada. As cartas no campo permanecem viradas para baixo, inclusive para o dono; a mão indica onde cada carta foi colocada.

Pronto só aparece com os cinco slots preenchidos e trava a escolha daquele jogador. O servidor revela os dois campos quando ambos estão prontos. Nova rodada, disponível após a revelação, devolve as dez cartas às mãos dos dois jogadores. Hello World removido da interface e da API.

Estado compartilhado no servidor com Cloudflare D1. Atualização a cada segundo e reconexão automática. Controle de versão na escrita evita perder ações simultâneas; o número da rodada impede aplicar pedidos atrasados à rodada seguinte. Respostas anteriores à revelação não incluem os valores das cartas do oponente. A escolha de jogador continua livre, sem autenticação ou reserva de vaga nesta versão. Recarregar a página retorna à escolha de jogador; escolher o mesmo jogador recupera seu estado.

Fonte em app/, lib/game.ts e db/. Hospedagem Sites, identidade em .openai/hosting.json e migrações em drizzle/. Migrações anteriores preservadas; a tabela legada messages não é mais usada. Nunca salvar credenciais no repositório.

Testes de regras: node --test tests/game.test.mjs. Integração com o servidor local na porta 8787: node tests/room.integration.mjs (somente banco local; começar com sala vazia ou revelada). Conferência manual: dois clientes, cinco cartas de cada lado, primeiro Pronto sem revelar, segundo Pronto revelando as dez cartas nos slots correspondentes; Nova rodada limpa os dois campos.
