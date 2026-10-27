# Kron Card Game

Protótipo 0.6 de um cardgame online 1v1. Este diretório é o projeto do game; não confundir com Kron RPG.

Baralho de Guerreiro: dez definições em lib/cards.ts, transcritas da imagem do usuário em 27/10/2026, replicadas para ambos os jogadores. Textos visíveis em components/card-text.tsx e na ampliação. As duas cartas Não age têm IDs distintos. Definição compartilhada (texto e efeitos) é separada da instância de cada jogador. IDs internos anteriores 1–10 e A–J são preservados para manter rodadas salvas; os dois lados agora exibem Guerreiro 01–10 com os mesmos textos.

Os efeitos estão modelados, mas ainda não executados: dano/defesa com alvo de slot atual ou seguinte (descarte após slot 5); Ripostar exige dano real do oponente e não ativa contra outra Riposta; Atordoamento bloqueia a carta oposta do mesmo slot; Fadiga impede agir nas X rodadas seguintes ao uso (Fadiga 1 usada na rodada 1 retorna na 3). Nenhum cálculo de combate, vida ou bloqueio por Fadiga foi ativado nesta etapa. Detalhes e pendências em docs/warrior-rules.md.

Mouse over nas cartas: prévia ampliada da mão e de cartas ocupando slots, inclusive no modo Espectador. A prévia aparece ao lado sem alterar o campo e sem ser cortada pelo contêiner; cartas ocultas continuam ocultas. Foco de teclado também abre a prévia. Sair da carta, perder foco, pressionar Escape ou rolar fecha a prévia. Slots vazios não ampliam. Nenhuma mudança nas regras ou no estado compartilhado.

Entrada Espectador: acompanha a mesma sala, com Player 2 em cima e Player 1 embaixo. Não recebe mão e não tem ações de jogo, Pronto ou Nova rodada. Vê cartas viradas para baixo até ambos estarem prontos; depois vê os valores revelados. A API também omite mãos da visão de espectador e rejeita ações enviadas nessa função. Atualiza a cada segundo como os jogadores.

Campo de batalha: cinco slots por jogador, em duas fileiras com as mesmas cinco colunas. Slot 1 fica diante do slot 1, até 5. O jogador local aparece embaixo; o oponente, em cima. Em telas estreitas, o campo rola horizontalmente sem quebrar o alinhamento.

Sem login ou arte. Cada jogador começa com as dez cartas de Guerreiro e escolhe cinco cartas únicas para distribuir nos slots. Clique na carta e depois no slot; um slot ocupado pode ser esvaziado sem carta selecionada. As cartas no campo permanecem viradas para baixo, inclusive para o dono; a mão indica onde cada carta foi colocada.

Pronto só aparece com os cinco slots preenchidos e trava a escolha daquele jogador. O servidor revela os dois campos quando ambos estão prontos. Nova rodada, disponível após a revelação, devolve as dez cartas às mãos dos dois jogadores. Hello World removido da interface e da API.

Estado compartilhado no servidor com Cloudflare D1. Atualização a cada segundo e reconexão automática. Controle de versão na escrita evita perder ações simultâneas; o número da rodada impede aplicar pedidos atrasados à rodada seguinte. Respostas anteriores à revelação não incluem os valores das cartas do oponente. A escolha de jogador continua livre, sem autenticação ou reserva de vaga nesta versão. Recarregar a página retorna à escolha de jogador; escolher o mesmo jogador recupera seu estado.

Fonte em app/, lib/game.ts e db/. Hospedagem Sites, identidade em .openai/hosting.json e migrações em drizzle/. Migrações anteriores preservadas; a tabela legada messages não é mais usada. Nunca salvar credenciais no repositório.

Testes de regras e catálogo: node --test tests/game.test.mjs tests/cards.test.mjs. Integração com o servidor local na porta 8787: node tests/room.integration.mjs (somente banco local; começar com sala vazia ou revelada). Conferência manual: dois clientes, cinco cartas de cada lado, primeiro Pronto sem revelar, segundo Pronto revelando as dez cartas nos slots correspondentes; Nova rodada limpa os dois campos.
