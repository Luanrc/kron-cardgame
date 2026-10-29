# Mesa experimental com Three.js

Branch: `experiment/threejs-mockup`. Rota: `/mockup`. É um experimento de disposição e feedback visual, com Guerreiro versus Monge. A distribuição usa Hearthstone como referência: oponente acima, jogador abaixo, campo central, mão na base e ação principal à direita. Nenhuma arte da Blizzard foi usada.

## Funcionamento

- A partida usa `applyAction` e o motor de combate existente, inteiramente em memória do navegador. Não faz requisições à sala online, não tem persistência nem adversário conectado. Recarregar reinicia a simulação.
- O Monge recebe uma programação determinística válida, que varia entre rodadas e respeita Fadiga. O usuário joga de Guerreiro, clicando na carta e depois em um slot. Pode retirar cartas antes de confirmar.
- As duas Não age continuam obrigatórias. `Preencher exemplo` substitui a preparação atual por um plano válido. `Pronto` revela os pares em sequência; o dano de cada par continua simultâneo. Vida, vitória, empate e Fadiga vêm do motor real.
- A mão permanece acessível após a revelação para inspeção. `Nova rodada` mantém vida e Fadiga; `Reiniciar teste` começa outra simulação. Não há áudio nesta versão.

## Renderização

`components/table-scene.tsx` usa Three.js diretamente: câmera ortográfica, mesa com geometria extrudada e bordas chanfradas, iluminação, encaixes e volumes de cartas, elevação do slot em resolução e partículas entre pares. O texto e as interações permanecem em HTML, com ampliação por mouse ou foco, permitindo leitura e uso de teclado. O botão Mesa 3D permite comparar com uma mesa CSS; indisponibilidade de WebGL também usa esse fallback.

A animação respeita `prefers-reduced-motion`, pode ser desativada, pausa com a aba oculta e limita a resolução do canvas. Geometrias, materiais, observadores, temporizadores e contexto WebGL são liberados ao desmontar a cena. Por pedido do usuário, o mockup agora tem foco exclusivo em desktop, com mesa de 1440 px, sem trabalho de responsividade mobile.

## Revisão visual local

As revisões visuais foram realizadas localmente. Depois de aprová-las, o usuário autorizou salvar na branch experimental e integrar em staging e master para publicação. A Vercel deve publicar somente master; futuras alterações continuam sem publicação até serem promovidas à master. Removidos a mão decorativa do oponente, os monogramas K e o bloco de instruções Sua rodada; a moldura de portal do cabeçalho permanece vazia. As cartas do campo foram alongadas e os encaixes Three.js ajustados. Os prints devem mostrar a tela completa, incluindo toda a mão e os controles.

`/mockup/symbols` apresenta propostas de símbolos para as dez classes, ainda sem aprovação como identidade definitiva. Antes desta revisão, apenas Guerreiro (espadas cruzadas) e Monge (brilhos) tinham símbolos no mockup. A nova proposta usa mão aberta para Monge; o catálogo de candidatos fica em components/class-symbol.tsx.

Revisão seguinte: símbolos aprovados para o mockup, com punho fechado para Monge. Cabeçalho unificado em Kron Card Game, com a mesma fonte serifada. Removida a instrução de selecionar/ampliar. Arrastar da mão para um slot usa eventos de ponteiro, prévia acompanhando o mouse e destaque do destino; soltar fora do campo ou sobre o oponente não joga a carta. Escape cancela; clicar na carta e no slot continua funcionando. Cartas já usadas e preparação confirmada ficam bloqueadas.

A ampliação do mockup usa FramedCard: nome provisório (classe e número), espaço reservado para arte sem imagem, linha da classe e área de efeitos com explicações. CardZoom recebe uma variante específica, preservando a apresentação padrão do jogo atual. Cartas ocultas continuam sem mostrar a frente na ampliação; o arraste fecha e suspende as ampliações.

## Verificação

`tests/mockup.test.mjs` verifica sigilo do oponente, planos válidos, várias rodadas com o motor real, Fadiga e correção de preparações sem obrigatórias. Conferência visual inclui seleção, colocação, revelação, vida, nova rodada, controles 3D e movimento. As revisões seguintes focam somente desktop e verificam arraste válido, cancelamento fora do campo e ampliação com nome/arte reservada/regras. A promoção passa por staging e master, sem publicação em Sites.

Referências: [campo de Hearthstone](https://hearthstone.wiki.gg/wiki/Battlefield), [Three.js: criação de cena](https://threejs.org/manual/pages/creating-a-scene.html) e [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).
