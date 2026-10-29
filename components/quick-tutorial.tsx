export function QuickTutorial() {
 return <aside className="quick-tutorial" aria-labelledby="tutorial-title">
  <figure className="tutorial-art">
   <img src="/images/tutorial-battle.webp" width={1000} height={500} alt="Duas fileiras de cinco cartas, com cada carta alinhada à adversária que enfrentará." />
   <figcaption>Cada slot enfrenta o slot à sua frente.</figcaption>
  </figure>
  <div className="tutorial-copy">
   <h2 id="tutorial-title">Como jogar</h2>
   <ol>
    <li>Escolha seu jogador e um <strong>baralho</strong>.</li>
    <li>Preencha os <strong>5 slots</strong>. Inclua as cartas <strong>Não age</strong> obrigatórias.</li>
    <li>Clique em <strong>Pronto</strong>. As cartas são reveladas quando os dois confirmam.</li>
    <li>Os slots se enfrentam em ordem. <strong>1 de defesa bloqueia 1 de dano</strong>; os ataques são simultâneos.</li>
    <li>Reduza a vida do adversário a <strong>0</strong> para vencer.</li>
   </ol>
   <p>Cartas com <strong>Fadiga</strong> ficam indisponíveis por algumas rodadas. Passe o mouse sobre uma carta para ler seus efeitos.</p>
  </div>
 </aside>;
}
