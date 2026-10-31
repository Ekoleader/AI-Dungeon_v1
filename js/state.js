// state.js — the game's memory. Everything about the current adventure lives in
// one object called `state`. We save it to the browser's localStorage after
// every change, so closing the iPad's browser doesn't lose the game.

const SAVE_KEY = 'firstQuest.save.v2';
const SETTINGS_KEY = 'firstQuest.settings.v1';

function newState() {
  return {
    version: 2,
    screen: 'title',      // title | setup | pick | game
    adventureId: 'everlight', // which adventure is being played (see adventures.js)
    setup: null,          // draft heroes while creating the party
    party: [],            // finished heroes
    sceneIndex: 0,
    phase: null,          // what the action area is waiting for
    spotlight: -1,        // index of the hero whose turn it is in solo scenes
    introIndex: 0,
    pending: null,        // the roll about to happen
    group: null,          // group check results
    battle: null,         // boss fight progress
    inspiration: 0,
    flags: {},
    log: [],              // the story so far
    badges: {},
  };
}

function saveGame(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode: play on without saving */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return saved && saved.version === 2 ? upgradeState(saved) : null;
  } catch (e) { return null; }
}

function clearGame() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(DONE_KEY); } catch (e) { /* nothing to clear */ }
}

// Which adventures this iPad has finished (kept even when a new party starts).
const DONE_KEY = 'firstQuest.done.v1';
function doneAdventures() {
  try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {}; } catch (e) { return {}; }
}
function markAdventureDone(id) {
  const done = doneAdventures();
  done[id] = Date.now();
  try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch (e) { /* ignore */ }
}

function loadSettings() {
  const defaults = { apiKey: '', useAI: false, textSize: 'large', voiceOn: true, showPip: true, voiceName: '', voiceRate: 0.95 };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch (e) { return defaults; }
}

function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}

// ---- Hero maths -----------------------------------------------------------

// Ability modifier: (score - 10) / 2, rounded down. 14 → +2, 8 → -1.
function mod(score) { return Math.floor((score - 10) / 2); }

function signed(n) { return n >= 0 ? '+' + n : String(n); }

// Turn a hero's choices (and, for returning heroes, their level) into a
// ready-to-play hero. Scores = class + race + level-up boosts. Each level adds
// hit points: the full hit die at level 1, then half the die + 1 each level,
// plus the Constitution modifier every time (as in D&D).
function buildHero(draft, index) {
  const cls = CLASSES[draft.cls];
  const level = Math.max(1, Math.min(MAX_LEVEL, draft.level || 1));
  const perks = perksFor(draft.cls, level);
  const scores = { ...cls.scores };
  const bonus = RACES[draft.race].bonus;
  for (const key in bonus) scores[key] += bonus[key];
  for (const key in perks.scores) scores[key] += perks.scores[key];
  const conMod = mod(scores.con);
  const maxHp = Math.max(1, cls.hitDie + conMod) + (level - 1) * Math.max(1, Math.floor(cls.hitDie / 2) + 1 + conMod);
  return {
    id: 'h' + index,
    rosterId: draft.rosterId || null,
    player: (draft.player || '').trim(),
    name: (draft.name || '').trim(),
    pronouns: (draft.pronouns || '').trim() || 'they/them',
    race: draft.race,
    cls: draft.cls,
    sigil: draft.sigil,
    color: draft.color,
    look: (draft.look || '').trim(),
    backstory: (draft.backstory || '').trim(),
    portrait: { ...(draft.portrait || {}) },
    level,
    xp: draft.xp || 0,
    pastDeeds: (draft.deeds || []).slice(0, 3).map(d => d.adventure + (d.outcome ? ' (' + d.outcome.toLowerCase() + ')' : '')),
    perks: { crit: perks.crit, shield: perks.shield, skills: perks.skills },
    powers: perks.powers.map(id => ({ id, used: false })),
    scores,
    maxHp,
    hp: maxHp,
    down: false,
    spotlights: 0,
    successes: 0,
    moments: [],
  };
}

// Saves from before characters could level up: give their heroes the new fields.
function upgradeHero(h) {
  if (h.powers) return h;
  const perks = perksFor(h.cls, 1);
  h.level = 1; h.xp = 0; h.rosterId = h.rosterId || null; h.backstory = h.backstory || ''; h.portrait = h.portrait || {};
  h.perks = { crit: perks.crit, shield: perks.shield, skills: perks.skills };
  h.powers = perks.powers.map(id => ({ id, used: Boolean(h.powerUsed) }));
  h.successes = h.successes || 0; h.moments = h.moments || []; h.pastDeeds = [];
  delete h.powerUsed;
  return h;
}

function upgradeState(state) {
  if (state && Array.isArray(state.party)) state.party.forEach(upgradeHero);
  return state;
}

// The lowest natural roll that counts as a critical success (20, or 19 with Improved Critical).
function critMin(hero) { return hero.perks?.crit || 20; }

// How good is this hero at this skill? Returns the pieces so we can show the maths.
function skillBonus(hero, skillId) {
  const skill = SKILLS[skillId];
  const abilityMod = mod(hero.scores[skill.ability]);
  const prof = CLASSES[hero.cls].skills.includes(skillId) ? profBonus(hero.level || 1) : 0;
  const extra = hero.perks?.skills?.[skillId] || 0;
  return { ability: skill.ability, abilityMod, prof, extra, total: abilityMod + prof + extra };
}
