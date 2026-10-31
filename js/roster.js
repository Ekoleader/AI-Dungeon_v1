// roster.js — heroes that live on between adventures, paused adventures, and
// the backup file. Everything is kept in this iPad's localStorage.
//
//   The roster        every hero ever made, with their level, XP, backstory,
//                     portrait and a record of their deeds.
//   The shelf         adventures that were paused, ready to resume.
//   Backups           one .json file holding all of the above, to export
//                     (keep it safe) and import (on this or another iPad).

const ROSTER_KEY = 'firstQuest.roster.v1';
const SHELF_KEY = 'firstQuest.paused.v1';
const MAX_LEVEL = 5;

// XP needed for each level (simplified from the D&D tables so a level comes
// after about every adventure or two). Index = level.
const XP_FOR_LEVEL = [0, 0, 300, 900, 1800, 3000];

const XP_REWARDS = { finish: 300, victory: 100, success: 25 };

// Special abilities. "heal" powers are buttons on the hero card; "advantage"
// powers appear on the dice panel. Each can be used once per adventure.
const POWERS = {
  secondWind:    { name: 'Second Wind',    icon: '💪', kind: 'heal', target: 'self', die: 10, plus: h => h.level,
                   blurb: 'Once per adventure, heal yourself 1d10 + your level.' },
  cureWounds:    { name: 'Cure Wounds',    icon: '💚', kind: 'heal', target: 'any', die: 8, plus: h => mod(h.scores.wis),
                   blurb: 'Once per adventure, heal any hero 1d8 + Wisdom modifier.' },
  healingWord:   { name: 'Healing Word',   icon: '🗣️', kind: 'heal', target: 'any', die: 4, plus: h => mod(h.scores.wis),
                   blurb: 'Once per adventure, a quick word heals any hero 1d4 + Wisdom modifier.' },
  actionSurge:   { name: 'Action Surge',   icon: '⚡', kind: 'advantage', target: 'self',
                   blurb: 'Once per adventure, push yourself: advantage on one of your own rolls.' },
  cunningAction: { name: 'Cunning Action', icon: '🌀', kind: 'advantage', target: 'self',
                   blurb: 'Once per adventure, a quick trick: advantage on one of your own rolls.' },
  portent:       { name: 'Portent',        icon: '🔮', kind: 'advantage', target: 'any',
                   blurb: 'Once per adventure, see the future: give any hero advantage on a roll.' },
  bless:         { name: 'Bless',          icon: '🙏', kind: 'advantage', target: 'any',
                   blurb: 'Once per adventure, a blessing: give any hero advantage on a roll.' },
};

// What each class gains at each level. Every level also adds hit points.
// Kinds: power (a new once-per-adventure ability), crit (natural 19 counts as
// a 20), shield (take less damage per hit), skills (+bonus), scores (+ability).
const LEVEL_PERKS = {
  fighter: {
    1: { power: 'secondWind' },
    2: { power: 'actionSurge' },
    3: { name: 'Improved Critical', crit: 19, blurb: 'A natural 19 on the die counts as a critical success, just like a 20.' },
    4: { name: 'Stronger', scores: { str: 2 }, blurb: '+2 Strength (an Ability Score Improvement).' },
    5: { name: 'Extra Attack', skills: { athletics: 1, intimidation: 1 }, blurb: '+1 to Athletics and Intimidation.' },
  },
  wizard: {
    2: { name: 'Shield', shield: 1, blurb: 'A shimmering barrier: take 1 less damage from every hit.' },
    3: { power: 'portent' },
    4: { name: 'Sharper Mind', scores: { int: 2 }, blurb: '+2 Intelligence (an Ability Score Improvement).' },
    5: { name: 'Spell Mastery', skills: { arcana: 1, investigation: 1 }, blurb: '+1 to Arcana and Investigation.' },
  },
  rogue: {
    2: { power: 'cunningAction' },
    3: { name: 'Expertise', skills: { stealth: 2, sleight: 2 }, blurb: '+2 to Stealth and Sleight of Hand.' },
    4: { name: 'Quicker', scores: { dex: 2 }, blurb: '+2 Dexterity (an Ability Score Improvement).' },
    5: { name: 'Uncanny Dodge', shield: 2, blurb: 'Roll with the blow: take 2 less damage from every hit.' },
  },
  cleric: {
    1: { power: 'cureWounds' },
    2: { power: 'bless' },
    3: { power: 'healingWord' },
    4: { name: 'Wiser', scores: { wis: 2 }, blurb: '+2 Wisdom (an Ability Score Improvement).' },
    5: { name: 'Divine Strike', skills: { religion: 1, persuasion: 1 }, blurb: '+1 to Religion and Persuasion.' },
  },
};

// Proficiency bonus: +2 for levels 1-4, +3 from level 5 (as in D&D).
function profBonus(level) { return level >= 5 ? 3 : 2; }

function levelForXp(xp) {
  let level = 1;
  for (let l = 2; l <= MAX_LEVEL; l++) if (xp >= XP_FOR_LEVEL[l]) level = l;
  return level;
}

function perkName(perk) { return perk.power ? POWERS[perk.power].name : perk.name; }
function perkBlurb(perk) { return perk.power ? POWERS[perk.power].blurb : perk.blurb; }

// Everything a class has unlocked up to `level`, added together.
function perksFor(cls, level) {
  const out = { powers: [], crit: 20, shield: 0, skills: {}, scores: {}, list: [] };
  const table = LEVEL_PERKS[cls] || {};
  for (let l = 1; l <= level; l++) {
    const p = table[l];
    if (!p) continue;
    out.list.push({ level: l, name: perkName(p), blurb: perkBlurb(p) });
    if (p.power) out.powers.push(p.power);
    if (p.crit) out.crit = Math.min(out.crit, p.crit);
    if (p.shield) out.shield += p.shield;
    for (const k in p.skills || {}) out.skills[k] = (out.skills[k] || 0) + p.skills[k];
    for (const k in p.scores || {}) out.scores[k] = (out.scores[k] || 0) + p.scores[k];
  }
  return out;
}

// ---- Storage helpers ------------------------------------------------------------

function readJson(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ---- The roster -----------------------------------------------------------------

function loadRoster() { return readJson(ROSTER_KEY, []); }
function saveRoster(list) { writeJson(ROSTER_KEY, list); }
function rosterHero(id) { return loadRoster().find(r => r.id === id) || null; }

// The fields a player chooses (as opposed to earned ones like XP).
const HERO_FIELDS = ['player', 'name', 'pronouns', 'race', 'cls', 'sigil', 'color', 'look', 'backstory', 'portrait'];

function newRosterHero(draft) {
  const r = { id: newId('r'), xp: 0, level: 1, adventures: 0, deeds: [], created: Date.now(), updated: Date.now() };
  HERO_FIELDS.forEach(f => { r[f] = draft[f]; });
  r.portrait = { ...(draft.portrait || {}) };
  return r;
}

// Add or update a hero in the roster. Returns the stored record.
function storeRosterHero(record) {
  const list = loadRoster();
  record.updated = Date.now();
  const i = list.findIndex(r => r.id === record.id);
  if (i >= 0) list[i] = record; else list.push(record);
  saveRoster(list);
  return record;
}

function deleteRosterHero(id) { saveRoster(loadRoster().filter(r => r.id !== id)); }

// Turn a roster record into a seat draft for the party creator.
function seatFromRoster(r) {
  const seat = { rosterId: r.id };
  HERO_FIELDS.forEach(f => { seat[f] = r[f] ?? ''; });
  seat.portrait = { ...(r.portrait || {}) };
  return seat;
}

// ---- Adventure title (works with one adventure or many) ---------------------------

// Uses the adventure picker's adventureFor() when it exists, so saves and
// deeds name whichever adventure the party chose.
function currentAdventure(state) {
  const s = state || game;
  try { if (typeof adventureFor === 'function') return adventureFor(s); } catch (e) { /* fall through */ }
  return { title: 'The Stolen Everlight', scenes: typeof STORY !== 'undefined' ? STORY : [] };
}

function currentAdventureTitle(state) { return currentAdventure(state)?.title || 'The Stolen Everlight'; }

// ---- End of an adventure: XP, levels and deeds -------------------------------------

// Called once when a quest is complete. Writes every hero's XP and deeds back to
// the roster and returns what each hero gained, for the celebration screen.
function recordAdventure(state) {
  if (state.rosterResults) return state.rosterResults;
  const title = currentAdventureTitle(state);
  const victory = state.flags?.victory !== false;
  const results = [];
  state.party.forEach(hero => {
    let record = hero.rosterId ? rosterHero(hero.rosterId) : null;
    if (!record) { record = newRosterHero(hero); hero.rosterId = record.id; }
    const xp = XP_REWARDS.finish + (victory ? XP_REWARDS.victory : 0) + XP_REWARDS.success * (hero.successes || 0);
    const oldLevel = record.level || 1;
    record.xp = (record.xp || 0) + xp;
    record.level = levelForXp(record.xp);
    record.adventures = (record.adventures || 0) + 1;
    record.deeds = record.deeds || [];
    record.deeds.unshift({
      when: Date.now(),
      adventure: title,
      outcome: victory ? 'Victory' : 'The villain escaped',
      xp,
      highlights: (hero.moments || []).slice(0, 5),
    });
    record.deeds = record.deeds.slice(0, 40);
    storeRosterHero(record);
    const gained = [];
    for (let l = oldLevel + 1; l <= record.level; l++) {
      const p = (LEVEL_PERKS[record.cls] || {})[l];
      gained.push({ level: l, name: p ? perkName(p) : 'Tougher', blurb: p ? perkBlurb(p) : 'More hit points.' });
    }
    results.push({ heroId: hero.id, rosterId: record.id, xp, totalXp: record.xp, oldLevel, level: record.level, gained });
  });
  state.rosterResults = results;
  return results;
}

// A notable moment for a hero's record of deeds ("Natural 20 on Persuasion").
function noteMoment(hero, text) {
  hero.moments = hero.moments || [];
  if (hero.moments.length < 12 && !hero.moments.includes(text)) hero.moments.push(text);
}

// ---- Paused adventures (the shelf) --------------------------------------------------

function loadShelf() { return readJson(SHELF_KEY, []); }
function saveShelf(list) { return writeJson(SHELF_KEY, list); }

function shelfLabel(state) {
  const scenes = currentAdventure(state)?.scenes || [];
  const sceneTitle = state.screen === 'game' ? (scenes[state.sceneIndex]?.title || '') : '';
  return {
    adventure: currentAdventureTitle(state),
    scene: sceneTitle,
    party: (state.party || []).map(h => h.name),
  };
}

// Put an adventure on the shelf. Returns false if the iPad's storage is full.
function pauseAdventure(state) {
  const shelf = loadShelf();
  const copy = JSON.parse(JSON.stringify(state));
  copy.log = (copy.log || []).filter(e => !e.pending);
  shelf.unshift({ id: newId('p'), savedAt: Date.now(), ...shelfLabel(copy), state: copy });
  return saveShelf(shelf.slice(0, 12));
}

function takeFromShelf(id) {
  const shelf = loadShelf();
  const item = shelf.find(p => p.id === id);
  saveShelf(shelf.filter(p => p.id !== id));
  return item ? item.state : null;
}

function removeFromShelf(id) { saveShelf(loadShelf().filter(p => p.id !== id)); }

// ---- Backup file ---------------------------------------------------------------------

function makeBackup(currentState) {
  const settings = { ...loadSettings() };
  delete settings.apiKey; // never put the API key in a file that might be shared
  return {
    app: 'first-quest',
    kind: 'backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    roster: loadRoster(),
    paused: loadShelf(),
    current: currentState && currentState.screen === 'game' && currentState.phase !== 'end' ? currentState : null,
    settings,
  };
}

function downloadBackup(currentState) {
  const data = JSON.stringify(makeBackup(currentState), null, 1);
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `first-quest-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Merge a backup into this iPad. Heroes and paused games are matched by id;
// the newer copy of a hero wins. Nothing already here is deleted.
function importBackup(data) {
  if (!data || data.app !== 'first-quest' || data.kind !== 'backup') throw new Error('That file isn\'t a First Quest backup.');
  const roster = loadRoster();
  let heroes = 0, games = 0;
  (data.roster || []).forEach(r => {
    if (!r || !r.id || !r.name || !CLASSES[r.cls] || !RACES[r.race]) return;
    const i = roster.findIndex(x => x.id === r.id);
    if (i < 0) { roster.push(r); heroes++; }
    else if ((r.updated || 0) > (roster[i].updated || 0)) { roster[i] = r; heroes++; }
  });
  saveRoster(roster);
  const shelf = loadShelf();
  const incoming = [...(data.paused || [])];
  if (data.current && data.current.version === 2) {
    incoming.push({ id: 'imported-' + (data.exportedAt || Date.now()), savedAt: Date.parse(data.exportedAt) || Date.now(), ...shelfLabel(data.current), state: data.current });
  }
  incoming.forEach(p => {
    if (!p || !p.id || !p.state || shelf.some(x => x.id === p.id)) return;
    shelf.push(p); games++;
  });
  shelf.sort((a, b) => b.savedAt - a.savedAt);
  saveShelf(shelf);
  return { heroes, games };
}

// ---- Rules Pip can explain, and a badge for growing up ------------------------------

GLOSSARY.unshift(
  { keys: ['level up', 'levelling', 'leveling', 'level'], answer: 'Heroes gain experience points (XP) by finishing adventures. Enough XP and they level up: more hit points and a new ability. This app goes up to level 5, and your heroes are saved between adventures so they keep growing.' },
  { keys: ['xp', 'experience'], answer: 'Experience points (XP) measure how much a hero has learned. Here every hero gets 300 XP for finishing an adventure, 100 more for beating the villain, and 25 for each roll they succeed on.' },
  { keys: ['backstory', 'background'], answer: 'A backstory is your hero\'s life before the adventure: where they grew up, what they want, what they fear. It gives you ideas for roleplay, and the AI Dungeon Master will weave it into the story.' },
);

BADGES.levelUp = { icon: '⬆️', name: 'Level Up!', lesson: 'Experience points (XP) make heroes stronger between adventures.' };

// ---- Backstory ideas (the 🎲 button) -------------------------------------------------

const BACKSTORY_IDEAS = {
  origin: [
    'grew up in a lighthouse on a stormy coast', 'was raised by a travelling circus', 'was the baker\'s apprentice in a quiet village',
    'spent years as a city guard who never caught anyone', 'was found as a baby in a basket of turnips', 'grew up in a library, reading every book twice',
    'is the youngest of eleven noisy siblings', 'worked in a mine until a cave-in changed everything', 'was a temple bell-ringer with a habit of oversleeping',
  ],
  goal: [
    'wants to find a long-lost sister', 'dreams of seeing a real dragon (from a safe distance)', 'hopes to pay back an old debt to a kind stranger',
    'is searching for a legendary recipe', 'wants to prove the family name means something', 'promised a dying mentor to protect the weak',
    'is collecting stories to write the greatest book ever', 'wants enough gold to rebuild their burned-down home',
  ],
  quirk: [
    'is secretly terrified of chickens', 'hums when nervous, which is often', 'names every weapon they own', 'never turns down a dare',
    'keeps a pressed flower from home in their pocket', 'talks to their pet beetle, Gerald', 'can\'t resist a shiny trinket', 'always has a snack ready to share',
  ],
};

function randomBackstory(name) {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const who = (name || '').trim() || 'This hero';
  return `${who} ${pick(BACKSTORY_IDEAS.origin)}, ${pick(BACKSTORY_IDEAS.goal)}, and ${pick(BACKSTORY_IDEAS.quirk)}.`;
}
