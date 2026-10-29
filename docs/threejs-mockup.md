# Mesa experimental com Three.js

Branch: `experiment/threejs-mockup`. Rota: `/mockup`. É um experimento de disposição e feedback visual, com Guerreiro versus Monge. A distribuição usa Hearthstone como referência: oponente acima, jogador abaixo, campo central, mão na base e ação principal à direita. Nenhuma arte da Blizzard foi usada.

## Funcionamento

- A partida usa `applyAction` e o motor de combate existente, inteiramente em memória do navegador. Não faz requisições à sala online, não tem persistência nem adversário conectado. Recarregar reinicia a simulação.
- O Monge recebe uma programação determinística válida, que varia entre rodadas e respeita Fadiga. O usuário joga de Guerreiro, clicando na carta e depois em um slot. Pode retirar cartas antes de confirmar.
- As duas Não age continuam obrigatórias. `Preencher exemplo` substitui a preparação atual por um plano válido. `Pronto` revela os pares em sequência; o dano de cada par continua simultâneo. Vida, vitória, empate e Fadiga vêm do motor real.
- A mão permanece acessível após a revelação para inspeção. `Nova rodada` mantém vida e Fadiga; `Reiniciar teste` começa outra simulação. Não há áudio nesta versão.

## Renderização

`components/table-scene.tsx` usa Three.js diretamente: câmera ortográfica, mesa com geometria extrudada e bordas chanfradas, iluminação, encaixes e volumes de cartas, elevação do slot em resolução e partículas entre pares. O texto e as interações permanecem em HTML, com ampliação por mouse ou foco, permitindo leitura e uso de teclado. O botão Mesa 3D permite comparar com uma mesa CSS; indisponibilidade de WebGL também usa esse fallback.

A animação respeita `prefers-reduced-motion`, pode ser desativada, pausa com a aba oculta e limita a resolução do canvas. Geometrias, materiais, observadores, temporizadores e contexto WebGL são liberados ao desmontar a cena. Em telas estreitas, os cinco pares mantêm o alinhamento com rolagem horizontal; a Fadiga fica em um painel expansível.

## Verificação

`tests/mockup.test.mjs` verifica sigilo do oponente, planos válidos, várias rodadas com o motor real, Fadiga e correção de preparações sem obrigatórias. Conferência visual inclui seleção, colocação, revelação, vida, nova rodada, controles 3D e movimento, desktop e celular. Não há publicação desta branch em Sites nem merge em master/staging.

Referências: [campo de Hearthstone](https://hearthstone.wiki.gg/wiki/Battlefield), [Three.js: criação de cena](https://threejs.org/manual/pages/creating-a-scene.html) e [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).
