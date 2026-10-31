// app.js — the game itself: drawing the screens and reacting to taps.
//
// How it fits together:
//   game          the saved state (see state.js)
//   render()      redraws the screen from `game`
//   data-action   every button says what it does, e.g. data-action="roll";
//                 one click handler at the bottom reads it and calls a function.

// Shown on the title screen so you can tell the iPad has the latest update.
// Keep it the same as the ?v= numbers in index.html.
const APP_VERSION = '2026-10-31b';

let game = loadGame() || newState();
let showTitle = true;   // always open on the title screen; "Continue" resumes
let busy = false;       // true while dice roll or the DM is speaking
let logSeen = -1;       // how many story entries were on screen last time (for scrolling)
let logPin = -1;        // story entry kept at the top of the story box until a player scrolls
let view = null;        // 'heroes' while the Hall of Heroes is open
let editDraft = null;   // a roster hero being edited in the hero editor

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

function adventure() { return adventureFor(game); }
function story() { return adventure().scenes; }
function scene() { return story()[game.sceneIndex]; }
function boss() { return adventure().boss; }

function listNames(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

function fill(text, hero, extra) {
  for (const key in extra || {}) text = text.split('{' + key + '}').join(extra[key]);
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
  if (view === 'heroes') renderHall();
  else if (showTitle) renderTitle();
  else if (game.screen === 'setup') renderSetup();
  else if (game.screen === 'pick') renderPick();
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

function adventureInProgress() {
  return (game.screen === 'game' && game.phase !== 'end') || game.screen === 'setup';
}

function timeAgo(when) {
  const mins = Math.round((Date.now() - when) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function renderTitle() {
  const canContinue = ['setup', 'pick', 'game'].includes(game.screen);
  const shelf = loadShelf();
  const heroes = loadRoster().length;
  app.innerHTML = `
    <section class="title-screen">
      <div class="title-card parchment">
        <div class="title-dragon" aria-hidden="true">🐉</div>
        <h1>First Quest</h1>
        <p class="tagline">Dungeons &amp; Dragons adventures for 3 or 4 brand-new heroes,<br>played together around one screen. ${ADVENTURES.length} quests to choose from!</p>
        <div class="title-buttons">
          ${canContinue ? `<button class="big primary" data-action="continue">▶ Continue the adventure</button>` : ''}
          <button class="big ${canContinue ? '' : 'primary'}" data-action="new-party">✨ Gather a new party</button>
          <button class="big" data-action="hall">🏰 Hall of Heroes${heroes ? ` <small>(${heroes})</small>` : ''}</button>
        </div>
        ${shelf.length ? `<div class="shelf">
          <div class="pick-label">⏸ Paused adventures</div>
          ${shelf.map(p => `<div class="shelf-item">
            <div class="shelf-text"><b>${esc(p.adventure)}</b>${p.scene ? ` · ${esc(p.scene)}` : ''}<small>${esc(listNames(p.party || []))} · paused ${esc(timeAgo(p.savedAt))}</small></div>
            <button class="big primary small-big" data-action="resume" data-id="${esc(p.id)}">▶ Resume</button>
            <button class="icon-btn" data-action="drop-paused" data-id="${esc(p.id)}" aria-label="Delete this paused adventure">🗑️</button>
          </div>`).join('')}
        </div>` : ''}
        <p class="title-note">${aiEnabled() ? '🔮 AI Dungeon Master is on.' : '📜 Playing with the written story. Add an API key in ⚙️ Settings for an AI Dungeon Master.'}</p>
        <p class="version-note">Version ${APP_VERSION}</p>
      </div>
    </section>`;
}

// ---- Pause and resume -------------------------------------------------------------

function confirmPause() {
  if (busy) { toast('Let the Dungeon Master finish speaking first.'); return; }
  openModal(`
    <h3>⏸ Pause the adventure?</h3>
    <p>Everything is saved on this iPad: the story so far, hit points, whose turn it is. Pick it up any time from the main menu with <b>▶ Resume</b>.</p>
    <div class="button-row">
      <button class="big primary" data-action="pause-now">⏸ Pause and go to the menu</button>
      <button class="big" data-action="close-modal">Keep playing</button>
    </div>`);
}

// Put the current adventure on the shelf. Returns false if nothing was saved.
function shelveCurrent() {
  if (game.screen !== 'game' || game.phase === 'end') return false;
  if (!pauseAdventure(game)) { toast('The iPad\'s storage is full, so the adventure couldn\'t be paused. Export a backup in ⚙️ Settings.'); return false; }
  return true;
}

function pauseNow() {
  stopSpeaking();
  if (!shelveCurrent()) return;
  game = newState();
  save();
  closeModal();
  showTitle = true;
  toast('⏸ Adventure paused. Resume it from the menu.');
  render();
}

function resumePaused(id) {
  // Anything in progress goes on the shelf first, so nothing is ever lost.
  if (game.screen === 'game' && game.phase !== 'end') shelveCurrent();
  const state = takeFromShelf(id);
  if (!state) { render(); return; }
  game = upgradeState(state);
  save();
  showTitle = false;
  view = null;
  logSeen = -1;
  keepScreenAwake();
  if (game.screen === 'game' && (game.phase === 'narrating' || !game.phase)) { game.log = game.log.filter(e => !e.pending); enterScene(); return; }
  render();
}

// ---- Party creation --------------------------------------------------------

function defaultSeat(i) {
  return {
    player: '', name: '', pronouns: '',
    // Starting picks are pairs that have painted portraits.
    race: ['human', 'elf', 'halfling', 'dwarf'][i],
    cls: ['fighter', 'wizard', 'rogue', 'cleric'][i],
    sigil: SIGILS[[0, 2, 4, 6][i]],
    color: COLORS[i],
    look: '',
    backstory: '',
    portrait: {},
    rosterId: null,
  };
}

function startSetup() {
  if (shelveCurrent()) toast('⏸ Your unfinished adventure was paused. Resume it from the menu.');
  game = newState();
  game.screen = 'setup';
  game.setup = { size: 3, seats: [0, 1, 2, 3].map(defaultSeat) };
  showTitle = false;
  save();
  render();
  window.scrollTo(0, 0);
}

function seatPreviewStats(seat) {
  const record = seat.rosterId ? rosterHero(seat.rosterId) : null;
  const hero = buildHero({ ...seat, name: seat.name || '?', player: seat.player, level: record ? record.level : 1 }, 0);
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

// Portrait picks (skin, hair colour, hair style). `target` is "seat:0".."seat:3" or "edit".
function portraitPicker(target, draft) {
  const p = draft.portrait || {};
  const f = portraitFeatures(draft);
  const modeRow = heroArt(draft) ? `<div class="pp-row"><span class="pp-label">Picture</span>
      <button class="seg mini ${usesArt(draft) ? 'on' : ''}" data-action="portrait-pick" data-target="${target}" data-field="mode" data-value="art">🖼️ Painted</button>
      <button class="seg mini ${usesArt(draft) ? '' : 'on'}" data-action="portrait-pick" data-target="${target}" data-field="mode" data-value="drawn">✏️ Drawn</button></div>` : '';
  if (usesArt(draft)) return `<div class="portrait-picker">${modeRow}<p class="small">A painted portrait for every ${RACES[draft.race].name} ${CLASSES[draft.cls].name}. Pick ✏️ Drawn to design your own look instead.</p></div>`;
  return `
    <div class="portrait-picker">${modeRow}
      <div class="pp-row"><span class="pp-label">Skin</span>${SKIN_TONES.map(c => `<button class="swatch small ${f.skin === c ? 'on' : ''}" style="background:${c}" data-action="portrait-pick" data-target="${target}" data-field="skin" data-value="${c}" aria-label="Skin tone"></button>`).join('')}</div>
      <div class="pp-row"><span class="pp-label">Hair</span>${Object.entries(HAIR_COLOURS).map(([k, c]) => `<button class="swatch small ${f.hair === k ? 'on' : ''}" style="background:${c}" data-action="portrait-pick" data-target="${target}" data-field="hair" data-value="${k}" aria-label="${k} hair"></button>`).join('')}</div>
      <div class="pp-row"><span class="pp-label">Style</span>${Object.entries(HAIR_STYLES).map(([k, name]) => `<button class="seg mini ${f.style === k ? 'on' : ''}" data-action="portrait-pick" data-target="${target}" data-field="style" data-value="${k}">${name}</button>`).join('')}</div>
      ${p.skin || p.hair || p.style ? `<button class="link-btn" data-action="portrait-pick" data-target="${target}" data-field="reset">↺ Match the description again</button>` : ''}
    </div>`;
}

// "Who is your hero?": backstory, motivation and desire. `attr` is the
// data attribute that says where typing goes ("data-seat="0"" or "data-edit").
function characterSection(draft, attrFor, ideaTarget) {
  const name = esc((draft.name || '').trim() || 'your hero');
  return `
    <div class="character-section">
      <div class="pick-label">Who is ${name}? <span class="optional">(optional: helps you play in character, and the AI Dungeon Master uses it)</span></div>
      ${CHARACTER_FIELDS.map(f => `
        <label>${f.label} <span class="optional">${f.hint}</span>
          <textarea ${attrFor(f.key)} rows="${f.rows}" placeholder="${esc(f.placeholder((draft.name || '').trim() || 'your hero'))}">${esc(draft[f.key] || '')}</textarea>
        </label>`).join('')}
      <div class="button-row"><button class="chip" data-action="random-character" data-seat="${ideaTarget}">🎲 Give me ideas</button></div>
    </div>`;
}

// A one-line reminder of what drives the hero, for the spotlight moment.
function inCharacterHint(hero) {
  const bits = [];
  if (hero.motivation) bits.push(`<b>Drive:</b> ${esc(hero.motivation)}`);
  if (hero.desire) bits.push(`<b>Wants:</b> ${esc(hero.desire)}`);
  return bits.length ? `<p class="hint in-character">🎭 Play it in character! ${bits.join(' · ')}</p>` : '';
}

function renderSeat(seat, i) {
  const cls = CLASSES[seat.cls];
  const record = seat.rosterId ? rosterHero(seat.rosterId) : null;
  const level = record ? record.level : 1;
  return `
  <div class="seat parchment" style="--hero:${seat.color}">
    <div class="seat-head">
      <span class="seat-portrait" id="seat-portrait-${i}">${portraitSVG(seat, 84)}</span>
      <div class="seat-head-text">
        <div class="seat-label">Player ${i + 1}${record ? ` · returning hero, level ${level}` : ''}</div>
        <div class="seat-hero-name" id="seat-name-${i}">${esc(seat.name) || 'Unnamed hero'}</div>
        ${record ? `<button class="link-btn" data-action="seat-clear" data-seat="${i}">✕ Make a new hero instead</button>` : ''}
      </div>
    </div>
    ${record ? '' : savedHeroChips(i)}
    <div class="field-row">
      <label>Player's real name<input type="text" data-seat="${i}" data-field="player" value="${esc(seat.player)}" placeholder="e.g. Sam" autocomplete="off"></label>
      <label>Pronouns<input type="text" data-seat="${i}" data-field="pronouns" value="${esc(seat.pronouns)}" placeholder="they/them" autocomplete="off"></label>
    </div>
    <label>Hero's name
      <span class="with-button">
        <input type="text" data-seat="${i}" data-field="name" value="${esc(seat.name)}" placeholder="Your hero's name" autocomplete="off">
        ${record ? '' : `<button class="icon-btn" data-action="random-name" data-seat="${i}" aria-label="Suggest a name">🎲</button>`}
      </span>
    </label>
    ${record ? `<p class="blurb"><b>${RACES[seat.race].name} ${cls.name}, level ${level}.</b> ${record.adventures || 0} ${record.adventures === 1 ? 'adventure' : 'adventures'} so far, ${record.xp || 0} XP. Race and class stay the same for returning heroes.</p>` : `
    <div class="pick-label">Race</div>
    ${segmented(i, 'race', RACES, seat.race)}
    <p class="blurb">${RACES[seat.race].blurb}</p>
    <div class="pick-label">Class</div>
    ${segmented(i, 'cls', CLASSES, seat.cls)}
    <p class="blurb"><b>${cls.role}.</b> ${cls.blurb} Trained in ${cls.skills.map(s => SKILLS[s].name).join(', ')}.</p>`}
    <div class="pick-label">Sigil &amp; colour</div>
    <div class="sigils">${SIGILS.map(s => `<button class="sigil ${s === seat.sigil ? 'on' : ''}" data-action="seat-pick" data-seat="${i}" data-field="sigil" data-value="${s}">${s}</button>`).join('')}</div>
    <div class="swatches">${COLORS.map(c => `<button class="swatch ${c === seat.color ? 'on' : ''}" style="background:${c}" data-action="seat-pick" data-seat="${i}" data-field="color" data-value="${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
    <label>What do they look like? <span class="optional">(the portrait listens: try a beard, freckles, a scar, glasses or an eyepatch)</span>
      <textarea data-seat="${i}" data-field="look" rows="2" placeholder="e.g. Wild red hair, a patched green cloak, and a nervous grin">${esc(seat.look)}</textarea>
    </label>
    <div class="pick-label">Portrait</div>
    ${portraitPicker('seat:' + i, seat)}
    ${characterSection(seat, key => `data-seat="${i}" data-field="${key}"`, i)}
    ${seatPreviewStats(seat)}
  </div>`;
}

// Saved heroes who aren't already sitting at the table.
function savedHeroChips(i) {
  const seated = game.setup.seats.slice(0, game.setup.size).map(s => s.rosterId).filter(Boolean);
  const free = loadRoster().filter(r => !seated.includes(r.id));
  if (!free.length) return '';
  return `<div class="saved-heroes"><span class="pp-label">Bring back a saved hero:</span>
    ${free.map(r => `<button class="saved-chip" data-action="seat-load" data-seat="${i}" data-id="${esc(r.id)}" style="--hero:${r.color}">${portraitSVG(r, 30)} ${esc(r.name)} <small>Lv ${r.level || 1}</small></button>`).join('')}</div>`;
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

// Every hero at the table gets a place in the roster (new ones are added,
// returning ones are updated), then the party is built from those records
// so their levels and abilities come along.
function beginAdventure() {
  const { size, seats } = game.setup;
  const active = seats.slice(0, size);
  const missing = active.findIndex(s => !s.name.trim());
  if (missing >= 0) {
    toast(`Player ${missing + 1}'s hero needs a name. Tap 🎲 for ideas!`);
    document.querySelector(`input[data-seat="${missing}"][data-field="name"]`)?.focus();
    return;
  }
  const records = active.map((s, i) => {
    const draft = { ...s, player: s.player.trim() || `Player ${i + 1}`, name: s.name.trim(), look: s.look.trim(), backstory: (s.backstory || '').trim(), motivation: (s.motivation || '').trim(), desire: (s.desire || '').trim() };
    const existing = s.rosterId ? rosterHero(s.rosterId) : null;
    if (!existing) return storeRosterHero(newRosterHero(draft));
    HERO_FIELDS.forEach(f => { existing[f] = draft[f]; });
    return storeRosterHero(existing);
  });
  game.party = records.map((r, i) => buildHero({ ...r, rosterId: r.id }, i));
  game.setup = null;
  award('fellowship');
  openPicker();
}

// ---- Choosing an adventure ---------------------------------------------------

function openPicker() {
  game.screen = 'pick';
  showTitle = false;
  save();
  render();
  window.scrollTo(0, 0);
}

function monsterChip(id) {
  const m = MONSTERS[id];
  if (!m) return '';
  const pic = m.art ? `<img src="${esc(m.art)}" alt="">` : m.icon;
  return `<span class="monster-chip ${m.art ? 'has-art' : ''}" title="${esc(m.name)}"><span class="monster-icon">${pic}</span>${esc(m.name)}</span>`;
}

function renderPick() {
  const done = doneAdventures();
  const cards = ADVENTURES.map(a => `
    <button class="adventure-card parchment" data-action="pick-adventure" data-value="${a.id}">
      <span class="adv-top"><span class="adv-icon">${a.icon}</span>
        <span class="adv-style">${esc(a.style)}</span>
        ${done[a.id] ? '<span class="adv-done">✔ Completed</span>' : ''}</span>
      <span class="adv-title">${esc(a.title)}</span>
      <span class="adv-tagline">${esc(a.tagline)}</span>
      <span class="adv-boss">Boss: <b>${esc(a.boss.name.replace(/^the /, 'The '))}</b></span>
      <span class="adv-monsters">${a.monsters.map(monsterChip).join('')}</span>
    </button>`).join('');
  app.innerHTML = `
    <section class="setup">
      <div class="setup-intro parchment">
        <h2>Choose your adventure</h2>
        <p>${listNames(game.party.map(h => esc(h.name)))}, where will you go? Every adventure takes about 30-45 minutes, has three acts, and teaches the same rules in a new story. There's no wrong order.</p>
      </div>
      <div class="adventure-grid">${cards}</div>
    </section>`;
}

function startAdventure(id) {
  if (!ADVENTURE_BY_ID[id]) return;
  rebuildPartyFromRoster(); // fresh HP and abilities, plus any levels gained since last time
  Object.assign(game, { rosterResults: null, adventureId: id, screen: 'game', sceneIndex: 0, log: [], flags: {}, inspiration: 0, spotlight: -1, battle: null, group: null, pending: null, phase: null });
  keepScreenAwake();
  enterScene();
}

// Fresh copies of the same heroes, with any levels they've gained since.
function rebuildPartyFromRoster() {
  game.party = game.party.map((h, i) => {
    const record = h.rosterId ? rosterHero(h.rosterId) : null;
    return buildHero(record ? { ...record, rosterId: record.id } : h, i);
  });
}

// ---- The game screen ---------------------------------------------------------

function heroCard(hero) {
  const active = activeHeroId() === hero.id;
  const pct = Math.max(0, Math.round((hero.hp / hero.maxHp) * 100));
  const powers = (hero.powers || []).map(p => {
    const power = POWERS[p.id];
    if (p.used) return `<span class="power used">${power.name} used</span>`;
    if (power.kind === 'heal') return `<button class="power" data-action="power" data-hero="${hero.id}" data-power="${p.id}">${power.icon} ${power.name}</button>`;
    return `<span class="power ready" title="${esc(power.blurb)}">${power.icon} ${power.name} ready</span>`;
  }).join('');
  return `
  <div class="hero-card ${active ? 'active' : ''} ${hero.down ? 'down' : ''}" style="--hero:${hero.color}">
    ${active ? '<div class="spot-label">🌟 Your turn</div>' : ''}
    <div class="hero-top">
      <button class="portrait-btn" data-action="hero-sheet" data-hero="${hero.id}" aria-label="Open ${esc(hero.name)}'s character sheet">${portraitSVG(hero, 52)}<span class="lvl">${hero.level || 1}</span></button>
      <div class="hero-id">
        <div class="hero-name">${hero.sigil} ${esc(hero.name)}</div>
        <div class="hero-sub">Lv ${hero.level || 1} ${RACES[hero.race].name} ${CLASSES[hero.cls].name} · ${esc(hero.player)}</div>
      </div>
    </div>
    <div class="hp-bar" aria-label="Hit points"><div style="width:${pct}%"></div><span>${hero.down ? 'Knocked out' : `HP ${hero.hp} / ${hero.maxHp}`}</span></div>
    <div class="mini-stats">${Object.keys(ABILITIES).map(k => `<span><b>${ABILITIES[k].short}</b>${signed(mod(hero.scores[k]))}</span>`).join('')}</div>
    ${powers ? `<div class="powers">${powers}</div>` : ''}
  </div>`;
}

function currentActTitle() {
  for (let i = game.sceneIndex; i >= 0; i--) if (story()[i].actTitle) return story()[i].actTitle;
  return '';
}

function replayButton(i) {
  return voice.supported ? `<button class="replay" data-action="speak" data-index="${i}" aria-label="Read this aloud">🔊</button>` : '';
}

// A scene that names a monster with a picture shows it under the scene title.
function monsterPortrait(id) {
  const m = MONSTERS[id];
  if (!m || !m.art) return '';
  return `<figure class="monster-portrait"><img src="${esc(m.art)}" alt="${esc(m.name)}"><figcaption>${esc(m.name)}</figcaption></figure>`;
}

function logEntry(e, i) {
  switch (e.kind) {
    case 'scene':
      return `<div class="entry scene-head">${e.act ? `<div class="act">${esc(e.act)}</div>` : ''}<div class="scene-title">${esc(e.title)}</div>${monsterPortrait(e.monster)}</div>`;
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
          <div class="banner-buttons">${game.phase === 'end' ? '' : '<button class="pip-toggle" data-action="pause">⏸ Pause</button>'}<button class="pip-toggle" data-action="toggle-pip" aria-pressed="${showPip}">${showPip ? '🦉 Hide Pip' : '🦉 Show Pip'}</button></div></div>
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
    ${turnBanner(hero, `${adventure().introLine || 'the firelight finds you'}. Introduce your ${RACES[hero.race].name} ${CLASSES[hero.cls].name} to the table!`)}
    ${inCharacterHint(hero)}
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
    ${inCharacterHint(hero)}
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
  const adv = p.helperId || p.useInspiration || helpedInBattle || p.boost;
  // Once-per-adventure "advantage" powers: the hero's own, or a friend's that can target anyone.
  const boosts = game.party.flatMap(owner => (owner.powers || [])
    .filter(pw => !pw.used && POWERS[pw.id].kind === 'advantage' && !owner.down && (owner.id === hero.id || POWERS[pw.id].target === 'any'))
    .map(pw => {
      const power = POWERS[pw.id];
      const key = owner.id + ':' + pw.id;
      return `<button class="helper insp ${p.boost === key ? 'on' : ''}" data-action="boost" data-key="${key}" style="--hero:${owner.color}" ${busy ? 'disabled' : ''}>${power.icon} ${owner.id === hero.id ? '' : esc(owner.name) + ': '}${power.name}</button>`;
    })).join('');
  return `
    <div class="check">
      <div class="check-title">${hero.sigil} <b>${esc(hero.name)}</b>: ${esc(p.label)}</div>
      <div class="maths">
        <span class="die-word">d20</span>
        <span>${signed(b.abilityMod)} <small>${ABILITIES[b.ability].name}</small></span>
        ${b.prof ? `<span>+${b.prof} <small>trained in ${SKILLS[p.skill].name}</small></span>` : ''}
        ${b.extra ? `<span>+${b.extra} <small>level-up bonus</small></span>` : ''}
        <span class="vs">need <b>${p.dc}</b>+</span>
      </div>
      <details class="refresher"><summary>Need a refresher?</summary>
        <p>Roll the twenty-sided die (d20) and add ${esc(hero.name)}'s ${SKILLS[p.skill].name} bonus of <b>${signed(b.total)}</b>. That's the ${ABILITIES[b.ability].name} modifier${b.prof ? ` plus ${b.prof} for being trained in this skill` : ''}${b.extra ? ` plus ${b.extra} from leveling up` : ''}. Reach the Difficulty Class (DC) of ${p.dc} or more to succeed. A natural ${critMin(hero) < 20 ? critMin(hero) + ' or 20' : '20'} always succeeds and a natural 1 always fails (a simplified house rule).</p>
      </details>
      ${helpers ? `<div class="helper-row"><span>Anyone helping? <small>(gives advantage: roll 2 dice, keep the best)</small></span><div>${helpers}</div></div>` : ''}
      ${helpedInBattle ? `<div class="adv-note">🤝 A friend set this up: <b>advantage!</b></div>` : ''}
      ${game.inspiration > 0 ? `<button class="helper insp ${p.useInspiration ? 'on' : ''}" data-action="inspire" ${busy ? 'disabled' : ''}>✨ Spend Inspiration (${game.inspiration} left)</button>` : ''}
      ${boosts ? `<div class="helper-row"><span>Use a special ability? <small>(once per adventure, gives advantage)</small></span><div>${boosts}</div></div>` : ''}
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
      <div><span class="t-label">${esc(boss().hitsLabel)}</span>${pips(b.failures, 3, 'bad')}</div>
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
  // Learned the boss's weakness earlier? Then moves that use it are easier.
  const knows = game.flags.weakness || game.flags.fireSecret; // fireSecret: saves from before the picker
  return knows && action.weakDc ? action.weakDc : action.dc;
}

function renderEnd() {
  const earned = Object.keys(game.badges);
  const results = recordAdventure(game);
  save();
  if (results.some(r => r.level > r.oldLevel)) award('levelUp');
  const card = h => {
    const r = results.find(x => x.heroId === h.id) || { xp: 0, totalXp: 0, level: h.level, oldLevel: h.level, gained: [] };
    const up = r.level > r.oldLevel;
    return `<div class="end-hero ${up ? 'levelled' : ''}" style="--hero:${h.color}">
      ${portraitSVG(h, 64)}
      <b>${esc(h.name)}</b>
      <small>${RACES[h.race].name} ${CLASSES[h.cls].name}</small>
      <span class="xp-gain">+${r.xp} XP</span>
      ${up ? `<span class="level-up">⬆️ Level ${r.level}!</span>${r.gained.map(g => `<small class="new-ability"><b>${esc(g.name)}:</b> ${esc(g.blurb)}</small>`).join('')}` : `<small>${xpToNext(r.totalXp, r.level)}</small>`}
    </div>`;
  };
  return `
    <div class="end">
      <h3>🏆 Quest complete!</h3>
      <p>Every hero earns experience (XP) and the adventure goes into their record. They're saved in the 🏰 Hall of Heroes, ready for the next quest.</p>
      <div class="end-heroes">${game.party.map(card).join('')}</div>
      <p>Your party earned <b>${earned.length} of ${Object.keys(BADGES).length}</b> badges. Each one is a real D&amp;D rule you now know.</p>
      <div class="button-row">
        <button class="big" data-action="badges">🏅 See what you learned</button>
        <button class="big" data-action="choose-adventure">🗺️ Choose another adventure</button>
        <button class="big primary" data-action="new-party">✨ New party</button>
      </div>
    </div>`;
}

function xpToNext(xp, level) {
  if (level >= MAX_LEVEL) return 'Maximum level reached!';
  return `${XP_FOR_LEVEL[level + 1] - xp} XP to level ${level + 1}`;
}

// ---- Hall of Heroes, character sheets and the hero editor ---------------------------

function renderHall() {
  const roster = loadRoster().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  app.innerHTML = `
    <section class="hall">
      <div class="setup-intro parchment">
        <h2>🏰 Hall of Heroes</h2>
        <p>Every hero your table has made lives here, on this iPad. They keep their level, abilities and story between adventures. Bring them back when you gather a new party. Tap a hero to see their character sheet.</p>
        <div class="button-row">
          <button class="big" data-action="home">◀ Back to the menu</button>
          <button class="big" data-action="export">💾 Export a backup</button>
          <button class="big" data-action="import">📂 Import a backup</button>
        </div>
      </div>
      ${roster.length ? `<div class="hall-grid">${roster.map(r => `
        <button class="hall-card parchment" data-action="roster-sheet" data-id="${esc(r.id)}" style="--hero:${r.color}">
          ${portraitSVG(r, 96)}
          <span class="hall-name">${esc(r.name)}</span>
          <span class="hall-sub">Level ${r.level || 1} ${RACES[r.race].name} ${CLASSES[r.cls].name}</span>
          ${xpBar(r)}
          <span class="hall-sub">${r.adventures || 0} ${r.adventures === 1 ? 'adventure' : 'adventures'} · played by ${esc(r.player)}</span>
        </button>`).join('')}</div>`
      : '<div class="parchment empty-hall"><p>No heroes yet! Gather a party and finish an adventure, and your heroes will be waiting here.</p></div>'}
    </section>`;
}

function xpBar(r) {
  const level = r.level || 1, xp = r.xp || 0;
  if (level >= MAX_LEVEL) return '<span class="xp-bar"><span style="width:100%"></span><i>Max level</i></span>';
  const from = XP_FOR_LEVEL[level] || 0, to = XP_FOR_LEVEL[level + 1];
  const pct = Math.round(((xp - from) / (to - from)) * 100);
  return `<span class="xp-bar"><span style="width:${pct}%"></span><i>${xp} / ${to} XP</i></span>`;
}

// The character sheet. `inGame` is the live hero during an adventure (for HP).
function openHeroSheet(record, inGame) {
  const r = record || inGame;
  const level = r.level || 1;
  const hero = inGame || buildHero(r, 0);
  const perks = perksFor(r.cls, level);
  const next = level < MAX_LEVEL ? (LEVEL_PERKS[r.cls] || {})[level + 1] : null;
  const trained = CLASSES[r.cls].skills.map(k => `${SKILLS[k].name} ${signed(skillBonus(hero, k).total)}`).join(', ');
  const deeds = (record?.deeds || []);
  openModal(`
    <div class="sheet" style="--hero:${r.color}">
      <div class="sheet-head">
        ${portraitSVG(r, 120)}
        <div>
          <h3>${r.sigil} ${esc(r.name)}</h3>
          <div class="hall-sub">Level ${level} ${RACES[r.race].name} ${CLASSES[r.cls].name} · ${esc(r.pronouns || 'they/them')} · played by ${esc(r.player)}</div>
          ${record ? xpBar(record) : ''}
          <div class="hall-sub">HP ${inGame ? `${hero.hp} / ` : ''}${hero.maxHp} · Proficiency +${profBonus(level)}</div>
        </div>
      </div>
      <div class="stat-row">${Object.keys(ABILITIES).map(k => `<span class="stat"><b>${ABILITIES[k].short}</b>${hero.scores[k]}<i>${signed(mod(hero.scores[k]))}</i></span>`).join('')}</div>
      <p><b>Trained skills:</b> ${trained}</p>
      <div class="pick-label">Abilities</div>
      <ul class="ability-list">
        ${perks.list.map(p => `<li><b>${esc(p.name)}</b> <small>(level ${p.level})</small>: ${esc(p.blurb)}</li>`).join('') || '<li>Abilities unlock as this hero levels up.</li>'}
        ${next ? `<li class="locked">🔒 <b>${esc(perkName(next))}</b> <small>(at level ${level + 1})</small>: ${esc(perkBlurb(next))}</li>` : ''}
      </ul>
      ${r.look ? `<div class="pick-label">Looks</div><p>${esc(r.look)}</p>` : ''}
      <div class="pick-label">Who they are</div>
      ${CHARACTER_FIELDS.some(f => r[f.key]) ? CHARACTER_FIELDS.filter(f => r[f.key]).map(f => `<p><b>${f.label}:</b> ${esc(r[f.key])}</p>`).join('') : '<p class="small">Nothing written yet. Add a backstory, motivation and desire, and the AI Dungeon Master will weave them into the story.</p>'}
      ${record ? `<div class="pick-label">Deeds</div>
      ${deeds.length ? `<ul class="deeds">${deeds.map(d => `<li><b>${esc(d.adventure)}</b> <small>${new Date(d.when).toLocaleDateString()} · ${esc(d.outcome)} · +${d.xp} XP</small>${d.highlights?.length ? `<ul>${d.highlights.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : '<p class="small">No adventures finished yet.</p>'}
      <div class="button-row">
        <button class="big primary" data-action="edit-hero" data-id="${esc(record.id)}">✏️ Edit looks &amp; story</button>
        ${game.screen === 'game' ? '' : `<button class="big danger" data-action="delete-hero" data-id="${esc(record.id)}">🗑️ Retire hero</button>`}
      </div>` : ''}
    </div>`);
}

function openHeroEditor(id) {
  const r = rosterHero(id);
  if (!r) return;
  editDraft = JSON.parse(JSON.stringify(r));
  drawHeroEditor();
}

function drawHeroEditor() {
  const d = editDraft;
  openModal(`
    <h3>✏️ Edit ${esc(d.name)}</h3>
    <div class="editor-head"><span id="edit-portrait">${portraitSVG(d, 110)}</span>
      <div class="editor-fields">
        <label>Hero's name<input type="text" data-edit="name" value="${esc(d.name)}" autocomplete="off"></label>
        <div class="field-row">
          <label>Player<input type="text" data-edit="player" value="${esc(d.player)}" autocomplete="off"></label>
          <label>Pronouns<input type="text" data-edit="pronouns" value="${esc(d.pronouns)}" autocomplete="off"></label>
        </div>
      </div>
    </div>
    <div class="sigils">${SIGILS.map(s => `<button class="sigil ${s === d.sigil ? 'on' : ''}" data-action="edit-pick" data-field="sigil" data-value="${s}">${s}</button>`).join('')}</div>
    <div class="swatches">${COLORS.map(c => `<button class="swatch ${c === d.color ? 'on' : ''}" style="background:${c}" data-action="edit-pick" data-field="color" data-value="${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
    <label>What do they look like?<textarea data-edit="look" rows="2">${esc(d.look)}</textarea></label>
    ${portraitPicker('edit', d)}
    ${characterSection(d, key => `data-edit="${key}"`, 'edit')}
    <div class="button-row">
      <button class="big primary" data-action="save-hero">💾 Save</button>
      <button class="big" data-action="roster-sheet" data-id="${esc(d.id)}">Cancel</button>
    </div>`);
}

function saveHeroEdits() {
  if (!editDraft) return;
  if (!editDraft.name.trim()) { toast('Every hero needs a name.'); return; }
  editDraft.name = editDraft.name.trim();
  const saved = storeRosterHero(editDraft);
  // If this hero is in the current adventure, show the changes there too.
  (game.party || []).forEach(h => {
    if (h.rosterId !== saved.id) return;
    ['name', 'player', 'pronouns', 'sigil', 'color', 'look', 'backstory', 'motivation', 'desire', 'portrait'].forEach(f => { h[f] = saved[f]; });
  });
  save();
  editDraft = null;
  toast('Hero saved.');
  openHeroSheet(saved);
  render();
}

// ---- Backups --------------------------------------------------------------------------

function exportBackup() {
  try {
    downloadBackup(game);
    toast('💾 Backup saved. On iPad, look in the Files app → Downloads.');
  } catch (e) {
    toast('Sorry, the backup couldn\'t be saved: ' + e.message);
  }
}

function pickBackupFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const result = importBackup(JSON.parse(await file.text()));
      toast(`📂 Imported ${result.heroes} ${result.heroes === 1 ? 'hero' : 'heroes'} and ${result.games} paused ${result.games === 1 ? 'adventure' : 'adventures'}.`);
    } catch (e) {
      toast('📂 ' + (e instanceof SyntaxError ? 'That file couldn\'t be read.' : e.message));
    }
    render();
  });
  input.click();
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
  addLog({ kind: 'scene', act: s.actTitle || '', title: s.title, monster: s.monster || null });
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
    markAdventureDone(adventure().id);
  }
  save();
  render();
}

function nextScene() {
  if (busy) return;
  game.sceneIndex = Math.min(game.sceneIndex + 1, story().length - 1);
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
  const advantage = Boolean(p.helperId || p.useInspiration || p.battleAdv || p.boost);
  document.querySelectorAll('#actions button').forEach(b => { b.disabled = true; });
  const result = rollD20(hero, advantage);
  await animateDice(document.getElementById('tray'), result);

  const b = skillBonus(hero, p.skill);
  const total = result.kept + b.total;
  const crit = result.kept >= critMin(hero);
  const success = crit ? true : result.kept === 1 ? false : total >= p.dc;

  if (p.useInspiration) { game.inspiration--; award('inspired'); }
  if (p.boost) {
    const [ownerId, powerId] = p.boost.split(':');
    const owner = heroById(ownerId);
    const pw = owner?.powers.find(x => x.id === powerId);
    if (pw) { pw.used = true; addLog({ kind: 'system', text: `${POWERS[powerId].icon} ${owner.name} uses ${POWERS[powerId].name}: advantage!` }); }
  }
  if (success) hero.successes = (hero.successes || 0) + 1;
  if (result.kept === 20) noteMoment(hero, `Rolled a natural 20 on ${SKILLS[p.skill].name}`);
  else if (crit) noteMoment(hero, `Landed a critical ${result.kept} on ${SKILLS[p.skill].name}`);
  if (success && p.source === 'solo') noteMoment(hero, `${scene().title}: ${p.label}`);
  if (p.helperId || p.battleAdv) award('teamwork');
  award('firstRoll');
  if (result.kept === 20) award('nat20');
  if (result.kept === 1) award('nat1');
  if (result.lucky) award('lucky');
  hero.spotlights++;
  if (game.party.every(h => h.spotlights > 0)) award('everyone');

  const diceText = result.rolls.length > 1 ? `${result.rolls.join(' & ')} → ${result.kept}` : `${result.kept}`;
  const critText = result.kept === 20 ? ' NATURAL 20!' : crit ? ` A ${result.kept}: critical!` : result.kept === 1 ? ' Natural 1...' : '';
  const luck = result.lucky ? ' (Halfling luck rerolled a 1!)' : '';
  addLog({ kind: 'roll', success, text: `🎲 ${hero.name} · ${SKILLS[p.skill].name}: ${diceText} ${signed(b.total)} = ${total} vs DC ${p.dc}.${critText}${luck} ${success ? 'Success!' : 'Failure.'}` });
  await sleep(700);
  busy = false;

  if (p.source === 'solo') await resolveSolo(hero, success);
  else await resolveBattle(hero, success);
}

function damage(hero, amount) {
  const shield = Math.min(amount, hero.perks?.shield || 0);
  const shieldText = shield ? ` (${shield} blocked by ${hero.cls === 'rogue' ? 'Uncanny Dodge' : 'Shield'})` : '';
  amount -= shield;
  if (amount <= 0) { addLog({ kind: 'system', text: `🛡️ ${hero.name} shrugs off the hit${shieldText}.` }); return; }
  hero.hp = Math.max(0, hero.hp - amount);
  award('ouch');
  if (hero.hp === 0) {
    hero.down = true;
    noteMoment(hero, 'Was knocked out, and got back up');
    addLog({ kind: 'system', text: `💥 ${hero.name} takes ${amount} damage${shieldText} and is knocked out! A healer can bring ${hero.name} back.` });
  } else {
    addLog({ kind: 'system', text: `💥 ${hero.name} takes ${amount} damage${shieldText} (${hero.hp}/${hero.maxHp} HP left).` });
  }
}

async function resolveSolo(hero, success) {
  const choice = scene().choices[game.pending.index];
  let facts = fill(success ? choice.success : choice.fail, hero);
  if (success && choice.reward === 'inspiration' && !game.flags.weakness) {
    game.inspiration++;
    game.flags.weakness = true;
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
  const success = result.kept >= critMin(hero) ? true : result.kept === 1 ? false : total >= s.dc;
  game.group[heroId] = { roll: result.kept, total, success };
  if (success) hero.successes = (hero.successes || 0) + 1;
  if (result.kept === 20) noteMoment(hero, `Rolled a natural 20 on ${SKILLS[s.skill].name}`);
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
      addLog({ kind: 'system', text: boss().secretNote });
    }
    if (game.flags.alarm) addLog({ kind: 'system', text: boss().alarmNote });
    if (game.flags.weakness || game.flags.fireSecret) addLog({ kind: 'system', text: boss().weaknessNote });
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
    addLog({ kind: 'action', text: `${hero.sigil} ${hero.name} distracts ${boss().name} to set up the next hero. Advantage!` });
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
    facts = fill(boss().hit, hero, { label }) + ` (Party successes: ${b.successes} of ${b.needed}.)`;
  } else {
    b.failures++;
    hurt = rollDie(4);
    facts = fill(boss().miss, hero, { label: label.toLowerCase(), dmg: hurt }) + ` (${boss().hitsLabel}: ${b.failures} of 3.)`;
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
  addLog({ kind: 'roll', success: victory, text: victory ? boss().winLog : boss().loseLog });
  game.flags.victory = victory;
  game.phase = 'narrating';
  await narrate(fill(victory ? s.victory : s.defeat, catcher), s.brief);
  game.phase = 'result';
  save();
  render();
}

// ---- Hero powers -----------------------------------------------------------------

function usePower(heroId, powerId) {
  if (busy) return;
  const hero = heroById(heroId);
  const slot = hero?.powers.find(p => p.id === powerId);
  const power = POWERS[powerId];
  if (!slot || slot.used || power.kind !== 'heal') return;
  const amount = () => Math.max(1, rollDie(power.die) + power.plus(hero));
  if (power.target === 'self') {
    if (hero.hp >= hero.maxHp) { toast(`${hero.name} is already at full health. Save it for later!`); return; }
    heal(hero, hero, amount(), powerId);
    return;
  }
  openModal(`
    <h3>${power.icon} ${power.name}</h3>
    <p>${esc(hero.name)} lays a glowing hand on a friend. Who needs it most? Heals 1d${power.die} ${signed(power.plus(hero))} HP, once per adventure.</p>
    <div class="target-list">${game.party.map(t => `<button class="choice" data-action="heal-target" data-hero="${hero.id}" data-power="${powerId}" data-target="${t.id}" style="--hero:${t.color}"><span class="choice-label">${t.sigil} ${esc(t.name)}</span><span class="choice-meta">${t.down ? 'Knocked out' : `HP ${t.hp}/${t.maxHp}`}</span></button>`).join('')}</div>`);
}

function heal(healer, target, amount, powerId) {
  const power = POWERS[powerId];
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const wasDown = target.down;
  target.down = false;
  const slot = healer.powers.find(p => p.id === powerId);
  if (slot) slot.used = true;
  award('healer');
  if (target !== healer) noteMoment(healer, `Healed ${target.name} with ${power.name}`);
  addLog({ kind: 'system', text: `💚 ${healer.name} uses ${power.name}: ${target.name} heals ${target.hp - before} HP${wasDown ? ' and is back up' : ''} (${target.hp}/${target.maxHp}).` });
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
    <div class="setting">
      <div class="pick-label">Backup</div>
      <p class="small">Your heroes and paused adventures live only on this iPad. Export a backup file now and then (it goes to Files → Downloads). Import it to restore, or to move your heroes to another device. The API key is never put in the file.</p>
      <div class="button-row">
        <button class="big" data-action="export">💾 Export a backup</button>
        <button class="big" data-action="import">📂 Import a backup</button>
      </div>
    </div>
    <div class="setting danger-zone">
      <button class="big danger" data-action="wipe">🗑️ Erase the current adventure and its badges</button>
      <p class="small">Saved heroes and paused adventures are kept. Retire heroes from the 🏰 Hall of Heroes.</p>
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
    case 'home': closeModal(); showTitle = true; view = null; render(); break;
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
    case 'power': usePower(el.dataset.hero, el.dataset.power); break;
    case 'heal-target': {
      const healer = heroById(el.dataset.hero);
      const power = POWERS[el.dataset.power];
      heal(healer, heroById(el.dataset.target), Math.max(1, rollDie(power.die) + power.plus(healer)), el.dataset.power);
      break;
    }
    case 'boost': game.pending.boost = game.pending.boost === el.dataset.key ? null : el.dataset.key; save(); render(); break;
    case 'replay': startAdventure(adventure().id); break;
    case 'choose-adventure': openPicker(); break;
    case 'pick-adventure': startAdventure(value); break;
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
      speak('Hear me, adventurers! Danger stirs, and only you can stop it.', 'dm');
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
      if (confirm('Erase the current adventure and its badges? Saved heroes and paused adventures stay.')) {
        clearGame(); game = newState(); showTitle = true; closeModal(); render();
      }
      break;
    case 'close-modal': closeModal(); editDraft = null; break;
    case 'pause': confirmPause(); break;
    case 'pause-now': pauseNow(); break;
    case 'resume': resumePaused(el.dataset.id); break;
    case 'drop-paused':
      if (confirm('Delete this paused adventure? Its heroes stay in the Hall of Heroes.')) { removeFromShelf(el.dataset.id); render(); }
      break;
    case 'hall': closeModal(); view = 'heroes'; showTitle = true; render(); window.scrollTo(0, 0); break;
    case 'roster-sheet': editDraft = null; openHeroSheet(rosterHero(el.dataset.id)); break;
    case 'hero-sheet': {
      const hero = heroById(el.dataset.hero);
      if (hero) openHeroSheet(hero.rosterId ? rosterHero(hero.rosterId) : null, hero);
      break;
    }
    case 'edit-hero': openHeroEditor(el.dataset.id); break;
    case 'edit-pick': editDraft[el.dataset.field] = value; drawHeroEditor(); break;
    case 'save-hero': saveHeroEdits(); break;
    case 'delete-hero': {
      const r = rosterHero(el.dataset.id);
      if (r && confirm(`Retire ${r.name}? Their character sheet and deeds will be deleted from this iPad.`)) {
        deleteRosterHero(r.id); closeModal(); render();
      }
      break;
    }
    case 'seat-load': {
      const r = rosterHero(el.dataset.id);
      if (r) game.setup.seats[el.dataset.seat] = seatFromRoster(r);
      save(); render();
      break;
    }
    case 'seat-clear': game.setup.seats[el.dataset.seat] = defaultSeat(Number(el.dataset.seat)); save(); render(); break;
    case 'portrait-pick': {
      const draft = el.dataset.target === 'edit' ? editDraft : game.setup.seats[el.dataset.target.split(':')[1]];
      if (el.dataset.field === 'reset') draft.portrait = draft.portrait?.mode ? { mode: draft.portrait.mode } : {};
      else draft.portrait = { ...(draft.portrait || {}), [el.dataset.field]: value };
      if (el.dataset.target === 'edit') drawHeroEditor(); else { save(); render(); }
      break;
    }
    case 'random-character': {
      const editing = el.dataset.seat === 'edit';
      const draft = editing ? editDraft : game.setup.seats[el.dataset.seat];
      const ideas = randomCharacter(draft.name);
      Object.assign(draft, ideas);
      for (const key in ideas) {
        const box = document.querySelector(editing ? `[data-edit="${key}"]` : `textarea[data-seat="${el.dataset.seat}"][data-field="${key}"]`);
        if (box) box.value = ideas[key];
      }
      if (!editing) save();
      break;
    }
    case 'export': exportBackup(); break;
    case 'import': pickBackupFile(); break;
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
  if (el.dataset.field === 'look') {
    // The portrait reacts to the description as it's typed.
    const pic = document.getElementById('seat-portrait-' + el.dataset.seat);
    if (pic) pic.innerHTML = portraitSVG(game.setup.seats[el.dataset.seat], 84);
  }
  save();
});

document.addEventListener('input', event => {
  const el = event.target;
  if (!el.dataset.edit || !editDraft) return;
  editDraft[el.dataset.edit] = el.value;
  if (el.dataset.edit === 'look') document.getElementById('edit-portrait').innerHTML = portraitSVG(editDraft, 110);
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
