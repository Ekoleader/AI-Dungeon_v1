// app.js — the game itself: drawing the screens and reacting to taps.
//
// How it fits together:
//   game          the saved state (see state.js)
//   render()      redraws the screen from `game`
//   data-action   every button says what it does, e.g. data-action="roll";
//                 one click handler at the bottom reads it and calls a function.

let game = loadGame() || newState();
let showTitle = true;   // always open on the title screen; "Continue" resumes
let busy = false;       // true while dice roll or the DM is speaking
let logSeen = -1;       // how many story entries were on screen last time (for scrolling)
let logPin = -1;        // story entry kept at the top of the story box until a player scrolls

const app = document.getElementById('app');

// ---- Small helpers --------------------------------------------------------

function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function paragraphs(text) {
  return esc(text).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function heroById(id) { return game.party.find(h => h.id === id); }

function scene() { return STORY[game.sceneIndex]; }

function listNames(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

function fill(text, hero) {
  return text
    .replace(/\{hero\}/g, hero ? hero.name : 'the party')
    .replace(/\{party\}/g, listNames(game.party.map(h => h.name)));
}

function dcWord(dc) {
  if (dc <= 9) return 'easy';
  if (dc <= 11) return 'fair';
  if (dc <= 13) return 'tricky';
  return 'hard';
}

function save() { saveGame(game); }

function addLog(entry) { game.log.push(entry); save(); }

function toast(message) {
  const area = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  area.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3200);
}

function award(id) {
  if (game.badges[id]) return;
  game.badges[id] = Date.now();
  save();
  const b = BADGES[id];
  toast(`${b.icon} Badge earned: ${b.name}`);
}

// Whose turn is it right now? Used to highlight a hero card.
function activeHeroId() {
  if (!game.party.length) return null;
  if (game.phase === 'intro') return game.party[game.introIndex]?.id;
  if (game.phase === 'check') return game.pending?.heroId;
  if (game.phase === 'battle') return game.battle?.order[game.battle.turn];
  if (game.phase === 'choose') return game.party[game.spotlight]?.id;
  return null;
}

// ---- Rendering ------------------------------------------------------------

function render() {
  applyTextSize();
  if (showTitle) renderTitle();
  else if (game.screen === 'setup') renderSetup();
  else if (game.screen === 'game') renderGame();
  else renderTitle();
  const badgeCount = Object.keys(game.badges).length;
  document.getElementById('badge-count').textContent = badgeCount ? badgeCount : '';
  updateVoiceButton();
}

function updateVoiceButton() {
  const btn = document.getElementById('voice-btn');
  if (!voice.supported) { btn.hidden = true; return; }
  const on = loadSettings().voiceOn;
  btn.textContent = on ? '🔊' : '🔇';
  btn.classList.toggle('muted', !on);
}

function applyTextSize() {
  const size = loadSettings().textSize;
  document.documentElement.dataset.textSize = size;
}

function renderTitle() {
  const canContinue = game.screen === 'setup' || game.screen === 'game';
  app.innerHTML = `
    <section class="title-screen">
      <div class="title-card parchment">
        <div class="title-dragon" aria-hidden="true">🐉</div>
        <h1>First Quest</h1>
        <p class="tagline">A Dungeons &amp; Dragons adventure for 3 or 4 brand-new heroes,<br>played together around one screen.</p>
        <div class="title-buttons">
          ${canContinue ? `<button class="big primary" data-action="continue">▶ Continue the adventure</button>` : ''}
          <button class="big ${canContinue ? '' : 'primary'}" data-action="new-party">✨ Gather a new party</button>
        </div>
        <p class="title-note">${aiEnabled() ? '🔮 AI Dungeon Master is on.' : '📜 Playing with the written story. Add an API key in ⚙️ Settings for an AI Dungeon Master.'}</p>
      </div>
    </section>`;
}

// ---- Party creation --------------------------------------------------------

function defaultSeat(i) {
  return {
    player: '', name: '', pronouns: '',
    race: ['human', 'elf', 'dwarf', 'halfling'][i],
    cls: ['fighter', 'wizard', 'rogue', 'cleric'][i],
    sigil: SIGILS[[0, 2, 4, 6][i]],
    color: COLORS[i],
    look: '',
  };
}

function startSetup() {
  game = newState();
  game.screen = 'setup';
  game.setup = { size: 3, seats: [0, 1, 2, 3].map(defaultSeat) };
  showTitle = false;
  save();
  render();
  window.scrollTo(0, 0);
}

function seatPreviewStats(seat) {
  const hero = buildHero({ ...seat, name: seat.name || '?', player: seat.player }, 0);
  const chips = Object.keys(ABILITIES).map(k =>
    `<span class="stat" title="${ABILITIES[k].name}"><b>${ABILITIES[k].short}</b>${hero.scores[k]}<i>${signed(mod(hero.scores[k]))}</i></span>`
  ).join('');
  return `<div class="stat-row">${chips}<span class="stat hp"><b>HP</b>${hero.maxHp}</span></div>`;
}

function segmented(seatIndex, field, options, current) {
  return `<div class="segmented">` + Object.keys(options).map(key =>
    `<button class="seg ${key === current ? 'on' : ''}" data-action="seat-pick" data-seat="${seatIndex}" data-field="${field}" data-value="${key}">${options[key].name}</button>`
  ).join('') + `</div>`;
}

function renderSeat(seat, i) {
  const cls = CLASSES[seat.cls];
  return `
  <div class="seat parchment" style="--hero:${seat.color}">
    <div class="seat-head">
      <span class="sigil-badge">${seat.sigil}</span>
      <div>
        <div class="seat-label">Player ${i + 1}</div>
        <div class="seat-hero-name" id="seat-name-${i}">${esc(seat.name) || 'Unnamed hero'}</div>
      </div>
    </div>
    <div class="field-row">
      <label>Player's real name<input type="text" data-seat="${i}" data-field="player" value="${esc(seat.player)}" placeholder="e.g. Sam" autocomplete="off"></label>
      <label>Pronouns<input type="text" data-seat="${i}" data-field="pronouns" value="${esc(seat.pronouns)}" placeholder="they/them" autocomplete="off"></label>
    </div>
    <label>Hero's name
      <span class="with-button">
        <input type="text" data-seat="${i}" data-field="name" value="${esc(seat.name)}" placeholder="Your hero's name" autocomplete="off">
        <button class="icon-btn" data-action="random-name" data-seat="${i}" aria-label="Suggest a name">🎲</button>
      </span>
    </label>
    <div class="pick-label">Race</div>
    ${segmented(i, 'race', RACES, seat.race)}
    <p class="blurb">${RACES[seat.race].blurb}</p>
    <div class="pick-label">Class</div>
    ${segmented(i, 'cls', CLASSES, seat.cls)}
    <p class="blurb"><b>${cls.role}.</b> ${cls.blurb} Trained in ${cls.skills.map(s => SKILLS[s].name).join(', ')}.</p>
    <div class="pick-label">Sigil &amp; colour</div>
    <div class="sigils">${SIGILS.map(s => `<button class="sigil ${s === seat.sigil ? 'on' : ''}" data-action="seat-pick" data-seat="${i}" data-field="sigil" data-value="${s}">${s}</button>`).join('')}</div>
    <div class="swatches">${COLORS.map(c => `<button class="swatch ${c === seat.color ? 'on' : ''}" style="background:${c}" data-action="seat-pick" data-seat="${i}" data-field="color" data-value="${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
    <label>What do they look like? <span class="optional">(optional)</span>
      <textarea data-seat="${i}" data-field="look" rows="2" placeholder="e.g. Wild red hair, a patched green cloak, and a nervous grin">${esc(seat.look)}</textarea>
    </label>
    ${seatPreviewStats(seat)}
  </div>`;
}

function partyBalanceTip(seats) {
  const classes = seats.map(s => s.cls);
  const tips = [];
  if (!classes.includes('cleric')) tips.push('No Cleric means no healing magic. Fighters can still patch themselves up with Second Wind.');
  if (!classes.includes('rogue')) tips.push('No Rogue: sneaking past danger will be harder, so lean on Elves and Halflings.');
  if (!classes.includes('wizard')) tips.push('No Wizard: magic puzzles and Arcana checks will be tougher.');
  if (!classes.includes('fighter')) tips.push('No Fighter: nobody is built to take hits, so heal early!');
  if (!tips.length) tips.push('A perfectly balanced party: a protector, a spellcaster, a sneak and a healer. Classic!');
  return `<div class="pip-note"><span class="owl">🦉</span><div><b>Pip's party check:</b> ${tips.join(' ')}</div></div>`;
}

function renderSetup() {
  const { size, seats } = game.setup;
  const active = seats.slice(0, size);
  app.innerHTML = `
    <section class="setup">
      <div class="setup-intro parchment">
        <h2>Gather your party</h2>
        <p>Pass the iPad around the table. Each player creates one hero. Don't worry about getting it "right": every choice works, and Pip will explain things as you play.</p>
        <div class="size-picker">
          <span>How many heroes?</span>
          <button class="seg big-seg ${size === 3 ? 'on' : ''}" data-action="party-size" data-value="3">3 players</button>
          <button class="seg big-seg ${size === 4 ? 'on' : ''}" data-action="party-size" data-value="4">4 players</button>
        </div>
      </div>
      <div class="seats ${size === 4 ? 'four' : ''}">${active.map(renderSeat).join('')}</div>
      <div class="setup-footer">
        ${partyBalanceTip(active)}
        <button class="big primary" data-action="begin">⚔️ Begin the adventure</button>
      </div>
    </section>`;
}

function beginAdventure() {
  const { size, seats } = game.setup;
  const active = seats.slice(0, size);
  const missing = active.findIndex(s => !s.name.trim());
  if (missing >= 0) {
    toast(`Player ${missing + 1}'s hero needs a name. Tap 🎲 for ideas!`);
    document.querySelector(`input[data-seat="${missing}"][data-field="name"]`)?.focus();
    return;
  }
  game.party = active.map((s, i) => buildHero({ ...s, player: s.player || `Player ${i + 1}` }, i));
  game.setup = null;
  game.screen = 'game';
  game.sceneIndex = 0;
  game.log = [];
  award('fellowship');
  keepScreenAwake();
  enterScene();
}

// ---- The game screen ---------------------------------------------------------

function heroCard(hero) {
  const active = activeHeroId() === hero.id;
  const pct = Math.max(0, Math.round((hero.hp / hero.maxHp) * 100));
  const power = CLASSES[hero.cls].power;
  const powerBtn = power && !hero.powerUsed
    ? `<button class="power" data-action="power" data-hero="${hero.id}">✨ ${power.name}</button>`
    : power ? `<span class="power used">${power.name} used</span>` : '';
  return `
  <div class="hero-card ${active ? 'active' : ''} ${hero.down ? 'down' : ''}" style="--hero:${hero.color}">
    ${active ? '<div class="spot-label">🌟 Your turn</div>' : ''}
    <div class="hero-top">
      <span class="sigil-badge">${hero.sigil}</span>
      <div class="hero-id">
        <div class="hero-name">${esc(hero.name)}</div>
        <div class="hero-sub">${RACES[hero.race].name} ${CLASSES[hero.cls].name} · ${esc(hero.player)}</div>
      </div>
    </div>
    <div class="hp-bar" aria-label="Hit points"><div style="width:${pct}%"></div><span>${hero.down ? 'Knocked out' : `HP ${hero.hp} / ${hero.maxHp}`}</span></div>
    <div class="mini-stats">${Object.keys(ABILITIES).map(k => `<span><b>${ABILITIES[k].short}</b>${signed(mod(hero.scores[k]))}</span>`).join('')}</div>
    ${powerBtn}
  </div>`;
}

function currentActTitle() {
  for (let i = game.sceneIndex; i >= 0; i--) if (STORY[i].actTitle) return STORY[i].actTitle;
  return '';
}

function replayButton(i) {
  return voice.supported ? `<button class="replay" data-action="speak" data-index="${i}" aria-label="Read this aloud">🔊</button>` : '';
}

function logEntry(e, i) {
  switch (e.kind) {
    case 'scene':
      return `<div class="entry scene-head">${e.act ? `<div class="act">${esc(e.act)}</div>` : ''}<div class="scene-title">${esc(e.title)}</div></div>`;
    case 'dm':
      return `<div class="entry dm ${e.pending ? 'pending' : ''}">${e.pending ? '<span class="quill">The Dungeon Master is speaking<span class="dots">...</span></span>' : paragraphs(e.text)}${e.ai ? '<span class="ai-mark" title="Narrated by Claude">🔮</span>' : ''}${e.pending ? '' : replayButton(i)}</div>`;
    case 'player':
      return `<div class="entry player" style="--hero:${e.color}"><span class="sigil-badge small">${e.sigil}</span><div><b>${esc(e.speaker)}:</b> “${esc(e.text)}”</div></div>`;
    case 'action':
      return `<div class="entry action">${esc(e.text)}</div>`;
    case 'roll':
      return `<div class="entry roll ${e.success ? 'ok' : 'bad'}">${esc(e.text)}</div>`;
    case 'pip':
      return `<div class="entry pip"><span class="owl">🦉</span><div>${e.question ? `<div class="pip-q">“${esc(e.question)}”</div>` : ''}${e.pending ? 'Pip is thinking<span class="dots">...</span>' : paragraphs(e.text) + replayButton(i)}</div></div>`;
    default:
      return `<div class="entry system">${esc(e.text)}</div>`;
  }
}

function renderGame() {
  const s = scene();
  const tip = s.tip;
  const showPip = loadSettings().showPip;
  const oldLog = document.getElementById('log');
  const keepScroll = oldLog ? oldLog.scrollTop : 0;
  if (!oldLog) logSeen = -1; // coming back from the menu: find the latest narration again
  app.innerHTML = `
    <section class="game ${showPip ? '' : 'no-pip'}">
      <aside class="party-panel">${game.party.map(heroCard).join('')}
        ${game.inspiration ? `<div class="inspiration-pill">✨ Party Inspiration: ${game.inspiration}</div>` : ''}
      </aside>
      <section class="stage parchment">
        <div class="scene-banner"><div class="scene-label"><span class="act">${esc(currentActTitle())}</span><span class="scene-name">${esc(s.title)}</span></div>
          <button class="pip-toggle" data-action="toggle-pip" aria-pressed="${showPip}">${showPip ? '🦉 Hide Pip' : '🦉 Show Pip'}</button></div>
        <div class="log" id="log">${game.log.map(logEntry).join('')}</div>
        <div class="actions" id="actions">${renderActions()}</div>
      </section>
      ${showPip ? `<aside class="pip-panel">
        <div class="pip-card">
          <div class="pip-head"><span class="owl big">🦉</span><div><b>Pip's tip</b><div class="pip-topic">${esc(tip.title)}</div></div></div>
          <p>${esc(tip.text)}</p>
        </div>
        <div class="pip-ask">
          <div class="pip-ask-label">Ask Pip</div>
          <button class="chip" data-action="pip-quick" data-q="How do ability checks work?">How do checks work?</button>
          <button class="chip" data-action="pip-quick" data-q="What is advantage?">What's advantage?</button>
          <button class="chip" data-action="pip-quick" data-q="Can you give us a strategy hint for this scene?">Strategy hint</button>
          <button class="chip strong" data-action="pip-open">✍️ Ask anything</button>
        </div>
      </aside>` : ''}
    </section>`;
  scrollLog(keepScroll);
}

// When new story appears, show the START of it at the top of the story box so
// the table can read along while it's spoken. Otherwise stay where we were.
function scrollLog(keepScroll) {
  const log = document.getElementById('log');
  const entries = log.children;
  const count = game.log.length;
  let anchor = -1;
  if (logSeen < 0 || count < logSeen) {
    // Just opened the game (or restarted): jump to the latest narration.
    for (let i = count - 1; i >= 0; i--) if (game.log[i].kind === 'dm') { anchor = i; break; }
    // Include the scene title if it sits right above that narration.
    if (anchor > 0 && game.log[anchor - 1].kind === 'scene') anchor--;
  } else if (count > logSeen) {
    anchor = logSeen; // the first new entry
  }
  logSeen = count;
  if (anchor >= 0) logPin = anchor;
  // Keep the new story pinned to the top while the buttons below change size,
  // until a player touches the story box to scroll it themselves.
  if (logPin >= 0 && entries[logPin]) log.scrollTop = Math.max(0, entries[logPin].offsetTop - 8);
  else log.scrollTop = keepScroll;
  const unpin = () => { logPin = -1; };
  ['touchstart', 'wheel', 'mousedown'].forEach(ev => log.addEventListener(ev, unpin, { passive: true }));
}

function renderActions() {
  if (busy && game.phase !== 'check') return `<div class="waiting">📜 ...</div>`;
  switch (game.phase) {
    case 'intro': return renderIntro();
    case 'choose': return renderChoices();
    case 'check': return renderCheck();
    case 'group': return renderGroup();
    case 'initiative': return renderInitiative();
    case 'battle': return renderBattle();
    case 'result': return `<button class="big primary" data-action="next-scene">Continue ▶</button>`;
    case 'end': return renderEnd();
    default: return '';
  }
}

function turnBanner(hero, text) {
  return `<div class="turn-banner" style="--hero:${hero.color}"><span class="sigil-badge">${hero.sigil}</span><div><div class="turn-who">${esc(hero.name)} <span>(${esc(hero.player)})</span></div><div class="turn-what">${text}</div></div></div>`;
}

function renderIntro() {
  const hero = game.party[game.introIndex];
  return `
    ${turnBanner(hero, `the firelight finds you. Introduce your ${RACES[hero.race].name} ${CLASSES[hero.cls].name} to the table!`)}
    <p class="hint">Say it out loud in character, then type a line for the story if you like. Try: “I am ${esc(hero.name)}, and I've never backed down from a fight.”</p>
    <textarea id="intro-text" rows="2" placeholder="What does ${esc(hero.name)} say?"></textarea>
    <div class="button-row">
      <button class="big primary" data-action="intro-say">🎭 Say it</button>
      <button class="big" data-action="intro-skip">Skip</button>
    </div>`;
}

function choiceButton(hero, c, i, actionName) {
  const b = skillBonus(hero, c.skill);
  const special = c.onlyFor ? `<span class="tag">${CLASSES[hero.cls].name} only</span>` : '';
  return `<button class="choice" data-action="${actionName}" data-index="${i}">
    <span class="choice-label">${esc(c.label)} ${special}</span>
    <span class="choice-meta">${SKILLS[c.skill].name} (${ABILITIES[b.ability].short}) <b>${signed(b.total)}</b> · DC ${c.dc} <i>${dcWord(c.dc)}</i>${b.prof ? ' · trained' : ''}</span>
  </button>`;
}

function renderChoices() {
  const hero = game.party[game.spotlight];
  const choices = scene().choices;
  return `
    ${turnBanner(hero, 'the spotlight is on you. What do you do? Talk it over with the table first!')}
    <div class="choices">${choices.map((c, i) => (!c.onlyFor || c.onlyFor.includes(hero.cls)) ? choiceButton(hero, c, i, 'choose') : '').join('')}</div>`;
}

function renderCheck() {
  const p = game.pending;
  const hero = heroById(p.heroId);
  const b = skillBonus(hero, p.skill);
  const helpers = p.source === 'solo'
    ? game.party.filter(h => h.id !== hero.id && !h.down).map(h =>
        `<button class="helper ${p.helperId === h.id ? 'on' : ''}" data-action="help" data-hero="${h.id}" style="--hero:${h.color}" ${busy ? 'disabled' : ''}>${h.sigil} ${esc(h.name)} helps</button>`).join('')
    : '';
  const helpedInBattle = p.source === 'battle' && p.battleAdv;
  const adv = p.helperId || p.useInspiration || helpedInBattle;
  return `
    <div class="check">
      <div class="check-title">${hero.sigil} <b>${esc(hero.name)}</b>: ${esc(p.label)}</div>
      <div class="maths">
        <span class="die-word">d20</span>
        <span>${signed(b.abilityMod)} <small>${ABILITIES[b.ability].name}</small></span>
        ${b.prof ? `<span>+2 <small>trained in ${SKILLS[p.skill].name}</small></span>` : ''}
        <span class="vs">need <b>${p.dc}</b>+</span>
      </div>
      <details class="refresher"><summary>Need a refresher?</summary>
        <p>Roll the twenty-sided die (d20) and add ${esc(hero.name)}'s ${SKILLS[p.skill].name} bonus of <b>${signed(b.total)}</b>. That's the ${ABILITIES[b.ability].name} modifier${b.prof ? ' plus 2 for being trained in this skill' : ''}. Reach the Difficulty Class (DC) of ${p.dc} or more to succeed. A natural 20 always succeeds and a natural 1 always fails (a simplified house rule).</p>
      </details>
      ${helpers ? `<div class="helper-row"><span>Anyone helping? <small>(gives advantage: roll 2 dice, keep the best)</small></span><div>${helpers}</div></div>` : ''}
      ${helpedInBattle ? `<div class="adv-note">🤝 A friend set this up: <b>advantage!</b></div>` : ''}
      ${game.inspiration > 0 ? `<button class="helper insp ${p.useInspiration ? 'on' : ''}" data-action="inspire" ${busy ? 'disabled' : ''}>✨ Spend Inspiration (${game.inspiration} left)</button>` : ''}
      <div class="roll-line">
        <div class="dice-tray" id="tray">${adv ? '<div class="d20 idle"><span>20</span></div><div class="d20 idle"><span>20</span></div>' : '<div class="d20 idle"><span>20</span></div>'}</div>
        <button class="big primary roll-btn" data-action="roll" ${busy ? 'disabled' : ''}>🎲 Roll${adv ? ' with advantage' : ''}!</button>
      </div>
    </div>`;
}

function rollRows(kind) {
  const results = kind === 'group' ? game.group : game.battle.init;
  const skillId = kind === 'group' ? scene().skill : null;
  return game.party.map(h => {
    const r = results[h.id];
    const bonus = kind === 'group' ? skillBonus(h, skillId).total : mod(h.scores.dex);
    const label = kind === 'group' ? `${SKILLS[skillId].name} ${signed(bonus)}` : `Initiative ${signed(bonus)}`;
    const outcome = r
      ? `<span class="row-result ${kind === 'group' ? (r.success ? 'ok' : 'bad') : ''}">🎲 ${r.roll} ${signed(bonus)} = <b>${r.total}</b>${kind === 'group' ? (r.success ? ' ✔' : ' ✘') : ''}</span>`
      : `<button class="roll-small" data-action="${kind}-roll" data-hero="${h.id}" ${busy ? 'disabled' : ''}>🎲 Roll ${label}</button>`;
    return `<div class="roll-row" style="--hero:${h.color}"><span class="sigil-badge small">${h.sigil}</span><span class="row-name">${esc(h.name)}</span>${outcome}</div>`;
  }).join('');
}

function renderGroup() {
  const s = scene();
  return `
    <div class="check">
      <div class="check-title">👣 Group check: <b>${SKILLS[s.skill].name}</b>, DC ${s.dc}</div>
      <p class="hint">Everyone rolls. If at least half the party succeeds, you all make it. Each player taps their own button!</p>
      <div class="dice-tray" id="tray"></div>
      <div class="roll-rows">${rollRows('group')}</div>
    </div>`;
}

function renderInitiative() {
  return `
    <div class="check">
      <div class="check-title">⚡ Roll for initiative!</div>
      <p class="hint">Initiative decides who acts first: d20 + Dexterity modifier. Highest goes first.</p>
      <div class="dice-tray" id="tray"></div>
      <div class="roll-rows">${rollRows('initiative')}</div>
    </div>`;
}

function battleTracker() {
  const b = game.battle;
  const pips = (n, total, cls) => Array.from({ length: total }, (_, i) => `<span class="pip-dot ${i < n ? cls : ''}"></span>`).join('');
  const order = b.order.map((id, i) => {
    const h = heroById(id);
    return `<span class="order-chip ${i === b.turn ? 'now' : ''} ${h.down ? 'down' : ''}" style="--hero:${h.color}">${h.sigil} ${esc(h.name)}</span>`;
  }).join('<span class="arrow">›</span>');
  return `
    <div class="tracker">
      <div><span class="t-label">Party successes</span>${pips(b.successes, b.needed, 'good')}</div>
      <div><span class="t-label">Grubnak's hits</span>${pips(b.failures, 3, 'bad')}</div>
    </div>
    <div class="turn-order"><span class="t-label">Turn order</span>${order}</div>`;
}

function renderBattle() {
  const b = game.battle;
  const hero = heroById(b.order[b.turn]);
  const actions = scene().actions;
  const list = actions.map((a, i) => {
    if (a.onlyFor && !a.onlyFor.includes(hero.cls)) return '';
    if (a.help) return `<button class="choice" data-action="battle-act" data-index="${i}"><span class="choice-label">🤝 ${esc(a.label)}</span><span class="choice-meta">No roll needed</span></button>`;
    return choiceButton(hero, { ...a, dc: battleDc(a) }, i, 'battle-act');
  }).join('');
  return `
    ${battleTracker()}
    ${turnBanner(hero, `it's your turn! ${b.helpNext ? 'A friend has set you up: <b>advantage</b>!' : 'Choose your move.'}`)}
    <div class="choices">${list}</div>`;
}

function battleDc(action) {
  return game.flags.fireSecret && action.fireDc ? action.fireDc : action.dc;
}

function renderEnd() {
  const earned = Object.keys(game.badges);
  return `
    <div class="end">
      <h3>🏆 Quest complete!</h3>
      <div class="end-heroes">${game.party.map(h => `<div class="end-hero" style="--hero:${h.color}"><span class="sigil-badge">${h.sigil}</span><b>${esc(h.name)}</b><small>${RACES[h.race].name} ${CLASSES[h.cls].name}</small><small>${h.spotlights} ${h.spotlights === 1 ? 'moment' : 'moments'} in the spotlight</small></div>`).join('')}</div>
      <p>Your party earned <b>${earned.length} of ${Object.keys(BADGES).length}</b> badges. Each one is a real D&amp;D rule you now know.</p>
      <div class="button-row">
        <button class="big" data-action="badges">🏅 See what you learned</button>
        <button class="big" data-action="replay">🔁 Replay with the same heroes</button>
        <button class="big primary" data-action="new-party">✨ New party</button>
      </div>
    </div>`;
}

// ---- Story flow ---------------------------------------------------------------

async function narrate(facts, brief) {
  busy = true;
  const entry = { kind: 'dm', text: '', pending: true };
  game.log.push(entry);
  render();
  const result = await dmNarrate(game, facts, brief);
  entry.text = result.text;
  entry.pending = false;
  entry.ai = result.ai;
  speak(entry.text, 'dm');
  if (result.error) toast('🔮 The AI narrator is unavailable, so the written story takes over.');
  busy = false;
  save();
  render();
}

function nextSpotlight() {
  for (let step = 1; step <= game.party.length; step++) {
    const i = (game.spotlight + step) % game.party.length;
    if (!game.party[i].down) { game.spotlight = i; return game.party[i]; }
  }
  game.spotlight = 0;
  return game.party[0];
}

async function enterScene() {
  const s = scene();
  game.pending = null;
  // Simplified rest: knocked-out heroes get back up between scenes.
  game.party.forEach(h => {
    if (h.down) {
      h.down = false; h.hp = 1;
      addLog({ kind: 'system', text: `${h.name} catches a breath and staggers back up with 1 HP.` });
    }
  });
  addLog({ kind: 'scene', act: s.actTitle || '', title: s.title });
  const hero = s.type === 'solo' ? nextSpotlight() : null;
  game.phase = 'narrating';
  save();
  await narrate(fill(s.narration, hero), s.brief);

  if (s.type === 'intro') { game.phase = 'intro'; game.introIndex = 0; }
  if (s.type === 'solo') game.phase = 'choose';
  if (s.type === 'group') { game.group = {}; game.phase = 'group'; }
  if (s.type === 'boss') {
    game.battle = { init: {}, order: [], turn: 0, successes: 0, failures: 0, needed: game.flags.alarm ? 4 : 3, helpNext: false, lastHero: null };
    game.phase = 'initiative';
  }
  if (s.type === 'epilogue') {
    game.phase = 'end';
    award('questDone');
  }
  save();
  render();
}

function nextScene() {
  if (busy) return;
  game.sceneIndex = Math.min(game.sceneIndex + 1, STORY.length - 1);
  enterScene();
}

function introSay(skip) {
  const hero = game.party[game.introIndex];
  const text = (document.getElementById('intro-text')?.value || '').trim();
  if (!skip && text) {
    addLog({ kind: 'player', speaker: hero.name, text, sigil: hero.sigil, color: hero.color });
    award('roleplay');
  }
  game.introIndex++;
  if (game.introIndex >= game.party.length) { nextScene(); return; }
  save();
  render();
}

function chooseOption(index) {
  const hero = game.party[game.spotlight];
  const choice = scene().choices[index];
  game.pending = { source: 'solo', heroId: hero.id, skill: choice.skill, dc: choice.dc, label: choice.label, index, helperId: null, useInspiration: false };
  game.phase = 'check';
  addLog({ kind: 'action', text: `${hero.sigil} ${hero.name}: ${choice.label}` });
  render();
}

// One d20 check for the hero in game.pending, with dice animation.
async function performCheck() {
  if (busy) return;
  busy = true;
  const p = game.pending;
  const hero = heroById(p.heroId);
  const advantage = Boolean(p.helperId || p.useInspiration || p.battleAdv);
  document.querySelectorAll('#actions button').forEach(b => { b.disabled = true; });
  const result = rollD20(hero, advantage);
  await animateDice(document.getElementById('tray'), result);

  const b = skillBonus(hero, p.skill);
  const total = result.kept + b.total;
  const success = result.kept === 20 ? true : result.kept === 1 ? false : total >= p.dc;

  if (p.useInspiration) { game.inspiration--; award('inspired'); }
  if (p.helperId || p.battleAdv) award('teamwork');
  award('firstRoll');
  if (result.kept === 20) award('nat20');
  if (result.kept === 1) award('nat1');
  if (result.lucky) award('lucky');
  hero.spotlights++;
  if (game.party.every(h => h.spotlights > 0)) award('everyone');

  const diceText = result.rolls.length > 1 ? `${result.rolls.join(' & ')} → ${result.kept}` : `${result.kept}`;
  const crit = result.kept === 20 ? ' NATURAL 20!' : result.kept === 1 ? ' Natural 1...' : '';
  const luck = result.lucky ? ' (Halfling luck rerolled a 1!)' : '';
  addLog({ kind: 'roll', success, text: `🎲 ${hero.name} · ${SKILLS[p.skill].name}: ${diceText} ${signed(b.total)} = ${total} vs DC ${p.dc}.${crit}${luck} ${success ? 'Success!' : 'Failure.'}` });
  await sleep(700);
  busy = false;

  if (p.source === 'solo') await resolveSolo(hero, success);
  else await resolveBattle(hero, success);
}

function damage(hero, amount) {
  hero.hp = Math.max(0, hero.hp - amount);
  award('ouch');
  if (hero.hp === 0) {
    hero.down = true;
    addLog({ kind: 'system', text: `💥 ${hero.name} takes ${amount} damage and is knocked out! A healer can bring ${hero.name} back.` });
  } else {
    addLog({ kind: 'system', text: `💥 ${hero.name} takes ${amount} damage (${hero.hp}/${hero.maxHp} HP left).` });
  }
}

async function resolveSolo(hero, success) {
  const choice = scene().choices[game.pending.index];
  let facts = fill(success ? choice.success : choice.fail, hero);
  if (success && choice.reward === 'inspiration' && !game.flags.fireSecret) {
    game.inspiration++;
    game.flags.fireSecret = true;
  }
  if (choice.reward === 'secret') {
    if (success) game.flags.secret = true; else game.flags.alarm = true;
  }
  let hurt = 0;
  if (!success && choice.damageOnFail) {
    hurt = rollDie(choice.damageOnFail);
    facts += ` (${hero.name} takes ${hurt} damage.)`;
  }
  game.pending = null;
  game.phase = 'narrating';
  await narrate(facts, scene().brief);
  if (hurt) damage(hero, hurt);
  game.phase = 'result';
  save();
  render();
}

async function groupRoll(heroId) {
  if (busy || game.group[heroId]) return;
  busy = true;
  const hero = heroById(heroId);
  const s = scene();
  document.querySelectorAll('#actions button').forEach(b => { b.disabled = true; });
  const result = rollD20(hero, false);
  await animateDice(document.getElementById('tray'), result);
  const total = result.kept + skillBonus(hero, s.skill).total;
  const success = result.kept === 20 ? true : result.kept === 1 ? false : total >= s.dc;
  game.group[heroId] = { roll: result.kept, total, success };
  award('firstRoll');
  if (result.kept === 20) award('nat20');
  if (result.kept === 1) award('nat1');
  if (result.lucky) award('lucky');
  busy = false;
  save();
  render();

  if (Object.keys(game.group).length === game.party.length) {
    await sleep(600);
    const passed = Object.values(game.group).filter(r => r.success).length;
    const groupSuccess = passed >= Math.ceil(game.party.length / 2);
    award('groupCheck');
    addLog({ kind: 'roll', success: groupSuccess, text: `👣 Group ${SKILLS[s.skill].name}: ${passed} of ${game.party.length} succeeded. ${groupSuccess ? 'The party makes it!' : 'Not enough...'}` });
    game.phase = 'narrating';
    await narrate(fill(groupSuccess ? s.success : s.fail), s.brief);
    if (!groupSuccess) game.party.forEach(h => damage(h, 1));
    game.phase = 'result';
    save();
    render();
  }
}

async function initiativeRoll(heroId) {
  const b = game.battle;
  if (busy || b.init[heroId]) return;
  busy = true;
  const hero = heroById(heroId);
  document.querySelectorAll('#actions button').forEach(btn => { btn.disabled = true; });
  const result = rollD20(hero, false);
  await animateDice(document.getElementById('tray'), result);
  b.init[heroId] = { roll: result.kept, total: result.kept + mod(hero.scores.dex) };
  busy = false;
  save();
  render();

  if (Object.keys(b.init).length === game.party.length) {
    await sleep(700);
    award('initiative');
    b.order = game.party.map(h => h.id).sort((x, y) => b.init[y].total - b.init[x].total);
    addLog({ kind: 'system', text: `⚡ Turn order: ${b.order.map(id => heroById(id).name).join(' › ')}.` });
    if (game.flags.secret) {
      b.successes = 1;
      addLog({ kind: 'system', text: 'Thanks to Snik\'s back door, the party catches Grubnak by surprise: you start with 1 success!' });
    }
    if (game.flags.alarm) addLog({ kind: 'system', text: 'Snik raised the alarm, so Grubnak was ready for you. The party needs 4 successes this time.' });
    if (game.flags.fireSecret) addLog({ kind: 'system', text: '🔥 You know Grubnak fears fire! Fiery moves are easier (lower DC).' });
    b.turn = 0;
    skipDownHeroes();
    game.phase = 'battle';
    save();
    render();
  }
}

function skipDownHeroes() {
  const b = game.battle;
  for (let i = 0; i < b.order.length; i++) {
    if (!heroById(b.order[b.turn]).down) return true;
    b.turn = (b.turn + 1) % b.order.length;
  }
  return false; // everyone is down
}

function battleAction(index) {
  if (busy) return;
  const b = game.battle;
  const hero = heroById(b.order[b.turn]);
  const action = scene().actions[index];
  if (action.help) {
    b.helpNext = true;
    award('teamwork');
    addLog({ kind: 'action', text: `${hero.sigil} ${hero.name} distracts Grubnak to set up the next hero. Advantage!` });
    advanceBattleTurn();
    return;
  }
  game.pending = { source: 'battle', heroId: hero.id, skill: action.skill, dc: battleDc(action), label: action.label, index, helperId: null, useInspiration: false, battleAdv: b.helpNext };
  b.helpNext = false;
  addLog({ kind: 'action', text: `${hero.sigil} ${hero.name}: ${action.label}` });
  game.phase = 'check';
  save();
  render();
}

function advanceBattleTurn() {
  const b = game.battle;
  b.turn = (b.turn + 1) % b.order.length;
  if (!skipDownHeroes()) { finishBattle(false, null); return; }
  game.phase = 'battle';
  save();
  render();
}

async function resolveBattle(hero, success) {
  const b = game.battle;
  const label = game.pending.label;
  game.pending = null;
  let facts, hurt = 0;
  if (success) {
    b.successes++;
    facts = `${hero.name}'s move works: ${label}. Grubnak staggers back, yelping. (Party successes: ${b.successes} of ${b.needed}.)`;
  } else {
    b.failures++;
    hurt = rollDie(4);
    facts = `${hero.name} tries to ${label.toLowerCase()}, but Grubnak dodges and swings his rusty cleaver: ${hero.name} takes ${hurt} damage. (Grubnak's hits: ${b.failures} of 3.)`;
  }
  b.lastHero = hero.id;
  game.phase = 'narrating';
  await narrate(facts, scene().brief);
  if (hurt) damage(hero, hurt);
  if (b.successes >= b.needed) return finishBattle(true, hero);
  if (b.failures >= 3) return finishBattle(false, hero);
  advanceBattleTurn();
}

async function finishBattle(victory, hero) {
  const s = scene();
  const catcher = hero || game.party.find(h => !h.down) || game.party[0];
  addLog({ kind: 'roll', success: victory, text: victory ? '🏆 Victory! Grubnak is beaten.' : '😬 Grubnak gets away... but not with the lantern.' });
  game.flags.victory = victory;
  game.phase = 'narrating';
  await narrate(fill(victory ? s.victory : s.defeat, catcher), s.brief);
  game.phase = 'result';
  save();
  render();
}

// ---- Hero powers -----------------------------------------------------------------

function usePower(heroId) {
  if (busy) return;
  const hero = heroById(heroId);
  const power = CLASSES[hero.cls].power;
  if (!power || hero.powerUsed) return;
  if (power.id === 'secondWind') {
    if (hero.hp >= hero.maxHp) { toast(`${hero.name} is already at full health. Save it for later!`); return; }
    heal(hero, hero, rollDie(10) + 1, power.name);
    return;
  }
  // Cure Wounds: pick who to heal.
  openModal(`
    <h3>✨ Cure Wounds</h3>
    <p>${esc(hero.name)} lays a glowing hand on a friend. Who needs it most? Heals 1d8 ${signed(mod(hero.scores.wis))} HP, once per adventure.</p>
    <div class="target-list">${game.party.map(t => `<button class="choice" data-action="heal-target" data-hero="${hero.id}" data-target="${t.id}" style="--hero:${t.color}"><span class="choice-label">${t.sigil} ${esc(t.name)}</span><span class="choice-meta">${t.down ? 'Knocked out' : `HP ${t.hp}/${t.maxHp}`}</span></button>`).join('')}</div>`);
}

function heal(healer, target, amount, powerName) {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const wasDown = target.down;
  target.down = false;
  healer.powerUsed = true;
  award('healer');
  addLog({ kind: 'system', text: `💚 ${healer.name} uses ${powerName}: ${target.name} heals ${target.hp - before} HP${wasDown ? ' and is back up' : ''} (${target.hp}/${target.maxHp}).` });
  closeModal();
  save();
  render();
}

// ---- Pip ------------------------------------------------------------------------

async function askPip(question) {
  question = question.trim();
  if (!question) return;
  closeModal();
  award('curious');
  if (game.screen !== 'game') {
    const answer = await pipAnswer(game, question);
    openModal(`<h3>🦉 Pip says</h3><p class="pip-q">“${esc(question)}”</p>${paragraphs(answer.text)}`);
    speak(answer.text, 'pip');
    return;
  }
  const entry = { kind: 'pip', question, text: '', pending: true };
  game.log.push(entry);
  render();
  const answer = await pipAnswer(game, question);
  entry.text = answer.text;
  entry.pending = false;
  speak(entry.text, 'pip');
  save();
  render();
}

function openPipModal() {
  openModal(`
    <h3>🦉 Ask Pip anything</h3>
    <p>Rules, words you don't know, or "what should we do?" Pip will explain.</p>
    <textarea id="pip-question" rows="3" placeholder="e.g. What does Wisdom do?"></textarea>
    <div class="button-row"><button class="big primary" data-action="pip-send">Ask</button></div>`);
  setTimeout(() => document.getElementById('pip-question')?.focus(), 50);
}

// ---- Modals: settings, badges --------------------------------------------------------

function openModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function openBadges() {
  openModal(`
    <h3>🏅 Party badges</h3>
    <p>Each badge is a piece of D&amp;D you've learned by playing.</p>
    <div class="badge-grid">${Object.entries(BADGES).map(([id, b]) => `
      <div class="badge ${game.badges[id] ? 'earned' : ''}">
        <div class="badge-icon">${game.badges[id] ? b.icon : '🔒'}</div>
        <div><b>${b.name}</b><small>${b.lesson}</small></div>
      </div>`).join('')}</div>`);
}

function openSettings() {
  const s = loadSettings();
  openModal(`
    <h3>⚙️ Settings</h3>
    <div class="setting">
      <div class="pick-label">Text size</div>
      <div class="segmented">${['normal', 'large', 'huge'].map(t => `<button class="seg ${s.textSize === t ? 'on' : ''}" data-action="text-size" data-value="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    </div>
    <div class="setting">
      <div class="pick-label">Narrator voice</div>
      ${voice.supported ? `
      <p class="small">The iPad reads the story aloud using its built-in voices (free, no key needed). If you hear nothing, check the iPad's volume and that Silent mode is off.</p>
      <label class="toggle"><input type="checkbox" id="voice-on" ${s.voiceOn ? 'checked' : ''}> Read the story aloud</label>
      <label>Voice<select id="voice-name">${voiceOptions(s.voiceName)}</select></label>
      <label>Speed <span class="small" id="rate-label">${Number(s.voiceRate).toFixed(2)}×</span><input type="range" id="voice-rate" min="0.7" max="1.3" step="0.05" value="${s.voiceRate}"></label>
      <div class="button-row"><button class="big" data-action="test-voice">🔊 Test voice</button></div>`
      : '<p class="small">This browser can\'t speak aloud. Safari on iPad can.</p>'}
    </div>
    <div class="setting">
      <div class="pick-label">AI Dungeon Master (Claude)</div>
      <p class="small">With an Anthropic API key, Claude narrates the story and Pip can answer any question. Without one, the game uses its written story. Get a key at console.anthropic.com. The key is stored only on this iPad, so only use your own key on your own device.</p>
      <label>API key<input type="password" id="api-key" value="${esc(s.apiKey)}" placeholder="sk-ant-..." autocomplete="off"></label>
      <label class="toggle"><input type="checkbox" id="use-ai" ${s.useAI ? 'checked' : ''}> Use the AI Dungeon Master</label>
      <div class="button-row">
        <button class="big primary" data-action="save-settings">Save</button>
        <button class="big" data-action="test-ai">Test connection</button>
      </div>
      <p class="small" id="ai-status"></p>
    </div>
    <div class="setting danger-zone">
      <button class="big danger" data-action="wipe">🗑️ Erase saved game and badges</button>
    </div>`);
}

function voiceOptions(current) {
  if (!voice.voices.length) loadVoices();
  const chosen = pickVoice(current);
  return voice.voices.map(v =>
    `<option value="${esc(v.name)}" ${chosen && v.name === chosen.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`
  ).join('') || '<option value="">Default voice</option>';
}

function storeVoiceSettings() {
  if (!document.getElementById('voice-on')) return;
  const s = loadSettings();
  s.voiceOn = document.getElementById('voice-on').checked;
  s.voiceName = document.getElementById('voice-name').value;
  s.voiceRate = Number(document.getElementById('voice-rate').value);
  saveSettings(s);
}

function storeSettingsFromForm() {
  storeVoiceSettings();
  const s = loadSettings();
  s.apiKey = document.getElementById('api-key').value.trim();
  s.useAI = document.getElementById('use-ai').checked;
  saveSettings(s);
  resetClaudeClient();
}

async function testAI() {
  storeSettingsFromForm();
  const status = document.getElementById('ai-status');
  if (!loadSettings().apiKey) { status.textContent = 'Paste an API key first.'; return; }
  status.textContent = 'Asking the Dungeon Master to clear their throat...';
  try {
    const text = await askClaude(DM_SYSTEM, 'In one dramatic sentence, welcome the adventurers to First Quest.');
    status.textContent = '✅ It works! "' + text + '"';
  } catch (err) {
    status.textContent = '❌ That didn\'t work: ' + err.message;
  }
}

// ---- Keep the iPad awake during play --------------------------------------------------

let wakeLock = null;
async function keepScreenAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { /* not supported or not allowed: no problem */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && game.screen === 'game' && !showTitle) keepScreenAwake();
});

// ---- Taps ----------------------------------------------------------------------------

document.addEventListener('click', event => {
  unlockVoice(); // the first tap anywhere lets the iPad speak
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const value = el.dataset.value;

  switch (action) {
    case 'continue':
      showTitle = false;
      if (game.screen === 'game') {
        keepScreenAwake();
        // If the app was closed mid-sentence, finish the scene properly.
        if (game.phase === 'narrating' || !game.phase) { game.log = game.log.filter(e => !e.pending); enterScene(); return; }
      }
      render();
      break;
    case 'new-party': closeModal(); startSetup(); break;
    case 'home': closeModal(); showTitle = true; render(); break;
    case 'party-size': game.setup.size = Number(value); save(); render(); break;
    case 'seat-pick': game.setup.seats[el.dataset.seat][el.dataset.field] = value; save(); render(); break;
    case 'random-name': {
      const seat = game.setup.seats[el.dataset.seat];
      const ideas = NAME_IDEAS[seat.race];
      seat.name = ideas[Math.floor(Math.random() * ideas.length)];
      save(); render();
      break;
    }
    case 'begin': beginAdventure(); break;
    case 'intro-say': introSay(false); break;
    case 'intro-skip': introSay(true); break;
    case 'choose': chooseOption(Number(el.dataset.index)); break;
    case 'help':
      game.pending.helperId = game.pending.helperId === el.dataset.hero ? null : el.dataset.hero;
      save(); render();
      break;
    case 'inspire': game.pending.useInspiration = !game.pending.useInspiration; save(); render(); break;
    case 'roll': performCheck(); break;
    case 'group-roll': groupRoll(el.dataset.hero); break;
    case 'initiative-roll': initiativeRoll(el.dataset.hero); break;
    case 'battle-act': battleAction(Number(el.dataset.index)); break;
    case 'next-scene': nextScene(); break;
    case 'power': usePower(el.dataset.hero); break;
    case 'heal-target': {
      const healer = heroById(el.dataset.hero);
      heal(healer, heroById(el.dataset.target), Math.max(1, rollDie(8) + mod(healer.scores.wis)), 'Cure Wounds');
      break;
    }
    case 'replay':
      game.party.forEach(h => { h.hp = h.maxHp; h.down = false; h.powerUsed = false; h.spotlights = 0; });
      Object.assign(game, { sceneIndex: 0, log: [], flags: {}, inspiration: 0, spotlight: -1, battle: null, group: null, pending: null });
      enterScene();
      break;
    case 'pip-quick': askPip(el.dataset.q); break;
    case 'pip-open': openPipModal(); break;
    case 'pip-send': askPip(document.getElementById('pip-question').value); break;
    case 'badges': openBadges(); break;
    case 'settings': openSettings(); break;
    case 'text-size': {
      const s = loadSettings(); s.textSize = value; saveSettings(s);
      applyTextSize();
      document.querySelectorAll('[data-action="text-size"]').forEach(b => b.classList.toggle('on', b.dataset.value === value));
      break;
    }
    case 'save-settings': storeSettingsFromForm(); closeModal(); toast('Settings saved.'); render(); break;
    case 'test-ai': testAI(); break;
    case 'test-voice':
      storeVoiceSettings();
      speak('Hear me, adventurers! The Everlight has been stolen, and only you can bring it home.', 'dm');
      break;
    case 'speak': {
      const entry = game.log[Number(el.dataset.index)];
      if (entry) speak(entry.text, entry.kind === 'pip' ? 'pip' : 'dm');
      break;
    }
    case 'toggle-pip': {
      const s = loadSettings(); s.showPip = !s.showPip; saveSettings(s);
      render();
      break;
    }
    case 'toggle-voice': {
      const s = loadSettings(); s.voiceOn = !s.voiceOn; saveSettings(s);
      if (!s.voiceOn) stopSpeaking();
      toast(s.voiceOn ? '🔊 Narrator voice on' : '🔇 Narrator voice off');
      updateVoiceButton();
      break;
    }
    case 'wipe':
      if (confirm('Erase the saved adventure and all badges on this iPad?')) {
        clearGame(); game = newState(); showTitle = true; closeModal(); render();
      }
      break;
    case 'close-modal': closeModal(); break;
  }
});

// Typing in the party creator updates the draft without redrawing (keeps the keyboard open).
document.addEventListener('input', event => {
  const el = event.target;
  if (!el.dataset.seat || !el.dataset.field || !game.setup) return;
  game.setup.seats[el.dataset.seat][el.dataset.field] = el.value;
  if (el.dataset.field === 'name') {
    const label = document.getElementById('seat-name-' + el.dataset.seat);
    if (label) label.textContent = el.value || 'Unnamed hero';
  }
  save();
});

document.addEventListener('input', event => {
  if (event.target.id === 'voice-rate') {
    document.getElementById('rate-label').textContent = Number(event.target.value).toFixed(2) + '×';
  }
});

document.getElementById('modal').addEventListener('click', event => {
  if (event.target.id === 'modal') closeModal();
});

render();
