# Kron Card Game

Protótipo 0.2 de um cardgame online 1v1. Este diretório é o projeto do game; não confundir com Kron RPG.

Campo de batalha visual: cinco slots retangulares por jogador, em duas fileiras com as mesmas cinco colunas. Slot 1 fica diante do slot 1, e assim até 5. O jogador local aparece embaixo; o oponente, em cima. Em telas estreitas, o campo rola horizontalmente sem quebrar o alinhamento. Os slots ainda são apenas espaços visuais, sem cartas ou interação.

Escopo: sem login, sem regras de cartas, sem arte. Layout simples. Player 1 e Player 2 entram em uma sala global e enviam, respectivamente, Hello World 1 e Hello world 2 para todos.

Estado compartilhado no servidor com Cloudflare D1. A tela consulta a sala a cada segundo, mostra as últimas 100 mensagens e reconecta automaticamente. A escolha de jogador é livre, sem reserva de vaga nesta versão. Recarregar a página retorna à escolha de jogador; o histórico continua no servidor.

Fonte em app/ e db/. Hospedagem Sites, identidade em .openai/hosting.json e migrações em drizzle/. Nunca salvar credenciais no repositório.

Teste: abrir a URL em dois dispositivos ou abas, escolher jogadores diferentes e confirmar as duas mensagens em ambas as telas. Sem login necessário.
