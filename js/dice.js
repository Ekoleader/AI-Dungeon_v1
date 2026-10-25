// dice.js — rolling dice, and the little animation that makes it feel real.

function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

// Roll a d20 for a hero. With advantage, roll two and keep the higher.
// Halflings are Lucky: any natural 1 is rerolled once.
function rollD20(hero, advantage) {
  const rolls = [rollDie(20)];
  if (advantage) rolls.push(rollDie(20));
  let lucky = false;
  if (hero && hero.race === 'halfling') {
    for (let i = 0; i < rolls.length; i++) {
      if (rolls[i] === 1) { rolls[i] = rollDie(20); lucky = true; }
    }
  }
  const kept = Math.max(...rolls);
  return { rolls, kept, lucky };
}

// Shows spinning d20s in `tray`, flickering random numbers, then lands on the
// real results. Returns a Promise so the game can wait for it to finish.
function animateDice(tray, result) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduceMotion ? 200 : 1100;
  tray.innerHTML = '';
  const dice = result.rolls.map(() => {
    const die = document.createElement('div');
    die.className = 'd20 rolling';
    die.innerHTML = '<span>?</span>';
    tray.appendChild(die);
    return die;
  });

  return new Promise(resolve => {
    const flicker = setInterval(() => {
      dice.forEach(d => { d.firstChild.textContent = rollDie(20); });
    }, 70);
    setTimeout(() => {
      clearInterval(flicker);
      let keptShown = false;
      dice.forEach((d, i) => {
        const value = result.rolls[i];
        d.classList.remove('rolling');
        d.firstChild.textContent = value;
        if (value === 20) d.classList.add('crit');
        if (value === 1) d.classList.add('fumble');
        if (value === result.kept && !keptShown) { d.classList.add('kept'); keptShown = true; }
        else if (dice.length > 1) d.classList.add('dropped');
      });
      resolve();
    }, duration);
  });
}
