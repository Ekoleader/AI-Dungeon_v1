// state.js — the game's memory. Everything about the current adventure lives in
// one object called `state`. We save it to the browser's localStorage after
// every change, so closing the iPad's browser doesn't lose the game.

const SAVE_KEY = 'firstQuest.save.v2';
const SETTINGS_KEY = 'firstQuest.settings.v1';

function newState() {
  return {
    version: 2,
    screen: 'title',      // title | setup | game
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
    return saved && saved.version === 2 ? saved : null;
  } catch (e) { return null; }
}

function clearGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to clear */ }
}

function loadSettings() {
  const defaults = { apiKey: '', useAI: false, textSize: 'large' };
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

function buildHero(draft, index) {
  const cls = CLASSES[draft.cls];
  const scores = { ...cls.scores };
  const bonus = RACES[draft.race].bonus;
  for (const key in bonus) scores[key] += bonus[key];
  const maxHp = cls.hitDie + mod(scores.con);
  return {
    id: 'h' + index,
    player: draft.player.trim(),
    name: draft.name.trim(),
    pronouns: draft.pronouns.trim() || 'they/them',
    race: draft.race,
    cls: draft.cls,
    sigil: draft.sigil,
    color: draft.color,
    look: draft.look.trim(),
    scores,
    maxHp,
    hp: maxHp,
    down: false,
    powerUsed: false,
    spotlights: 0,
  };
}

// How good is this hero at this skill? Returns the pieces so we can show the maths.
function skillBonus(hero, skillId) {
  const skill = SKILLS[skillId];
  const abilityMod = mod(hero.scores[skill.ability]);
  const prof = CLASSES[hero.cls].skills.includes(skillId) ? 2 : 0;
  return { ability: skill.ability, abilityMod, prof, total: abilityMod + prof };
}
