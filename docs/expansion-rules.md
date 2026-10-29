# Expansão de baralhos — preparação local

Em 29/10/2026 o usuário autorizou criar e enviar estas alterações para a branch staging no GitHub. Não publicar em Sites nem enviar para master. O backend de testes ainda precisa ser configurado para usar as regras novas online.

| Classe | Cartas jogáveis | Vida | Cor base |
| --- | ---: | ---: | --- |
| Atirador | 10 | 10 | #174E50, verde azulado escuro |
| Patrulheiro | 10 | 10 | #628A3C, verde clássico |
| Guardião | 10 | 12 | #36779A, celeste fechado |
| Mago | 12 | 8 | #69BEDD, azul claro |
| Bárbaro | 10 | 11 | #AA5343, terracota avermelhado |
| Invocador | 11 | 11 | #1D5C45, jade escuro |

## Catálogo e apresentação

Os textos das seis imagens estão em lib/expansion-cards.ts, separados dos efeitos usados pelo motor. Textos compactos nas cartas e textos completos na ampliação. A seleção permite abrir uma prévia de qualquer baralho.

As três regras do Invocador são explicações, não cartas jogáveis. Acrescentada a defesa simples; Lobo com 2 de vida, +1 dano e Fadiga 1; Urso com 3 de vida, +1 defesa, +1 dano com Ripostar e Fadiga 2. Invocador está jogável localmente; regras das criaturas em docs/summoner-rules.md.

## Regras comuns

- Dano garantido ignora defesa comum, mas continua sujeito a Atordoamento, Defletir e Refletir. As duas cartas de defesa específicas do Guardião podem absorvê-lo. Um ponto de defesa é consumido uma única vez, mesmo com fontes normais e garantidas simultâneas.
- Cada seta avança um slot. Zero representa um slot sem o efeito da carta. Efeitos posteriores ao slot 5 são descartados. Atordoar a carta de origem impede a criação de seus efeitos seguintes; bônus já gerados não são cancelados por atordoar a carta do destino.
- Ações com recurso têm custo fixo (X nas imagens). Não há escolha de X para essas classes. O custo é pago uma vez quando a carta age, inclusive se o ataque for defendido ou defletido. Atordoamento impede o gasto. Saldo insuficiente impede a carta de agir e é registrado no confronto.
- Pronto valida os recursos potencialmente disponíveis na ordem dos slots. Ganhos condicionais podem falhar no combate; não se cria saldo negativo. Recursos persistem entre rodadas; reinício e reset restauram os valores iniciais apropriados.

## Atirador

Munição inicial e máxima: 6. Soma dos custos das cartas programadas limitada a 4 por rodada, independentemente das recargas. Recarga de +2 respeita o máximo e a outra completa até 6. A carta de 4 dano aplica dois marcadores de Sangramento no slot atual apenas se causar dano, seguindo a regra de Sangramento existente. Os disparos com setas consomem seu custo na origem.

## Patrulheiro e Guardião

O ataque de 2 do Patrulheiro tem metade garantida, sempre arredondada para baixo. Os outros ataques garantidos usam a regra comum. Ripostar continua exigindo dano real; Atordoamento da carta de Ripostar age independentemente do dano reativo.

Vingar usa a metade do dano absorvido por defesa até seu slot, inclusive, arredondada para baixo, e devolve nesse slot. A defesa consumida por Sangramento também é dano defendido. Vingar respeita os efeitos defensivos do alvo. Duas retaliações leem o mesmo retrato anterior à retaliação, evitando amplificação recursiva e prioridade de jogador.

## Mago e Premonição

Recurso Arcano inicial: 2. Não foi definido limite máximo. Ganhos anteriores podem financiar custos seguintes. Conjurações ofensiva/reforçada ganham 1 quando a condição de ausência de dano é satisfeita. Por decisão do usuário, Refletir não modifica a geração de recurso: essa condição é avaliada separadamente, desconsiderando reflexão. Recursos nunca são refletidos. Não existe reserva antecipada especial de 2 pontos para Atordoamento.

A carta de +3 Recurso Arcano não tem mais Flutuando e mantém Fadiga 2.

Premonição vale para a preparação da rodada seguinte. Antes de outras colocações, o adversário escolhe onde ficará uma de suas Não age, e o servidor coloca e trava essa carta. O Mago vê essa posição; os espectadores continuam vendo a carta oculta. As demais cartas permanecem ocultas até ambos confirmarem Pronto. O Mago aguarda a escolha para confirmar Pronto. Premonição não impõe uma Não age ao Bárbaro quando Fúria estiver ativa naquela rodada.

## Bárbaro

As versões “se sofrer dano” substituem o dano atual, preservando a seta seguinte. Reações se baseiam em dano efetivamente sofrido; duas cartas inativas não disparam uma à outra. X de vida perdida usa a vida inicial da classe menos a vida imediatamente antes do confronto atual, com divisão inteira quando exigida.

Fúria tem Fadiga 3. Se agir, as Não age ficam opcionais apenas na próxima rodada, continuam na mão e nunca recebem Fadiga. Na rodada posterior, a obrigação normal retorna. Fúria impede a obrigação criada por Premonição.

## Verificação e futura staging

Testes novos em tests/expansion.test.mjs, tests/summoner.test.mjs e respectivas integrações, além das regressões das classes existentes. Integrações alteram somente o D1 local.

Quando staging for preparada, precisará de um backend de testes próprio ou configuração equivalente. A prévia Vercel padrão ainda encaminha a sala ao servidor de produção; apenas enviar o frontend novo não habilita os novos baralhos naquele backend. Não apontar testes de integração nem resets de QA para a sala publicada.
