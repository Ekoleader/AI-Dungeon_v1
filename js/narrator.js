// narrator.js — the voices of the game: the Dungeon Master and Pip the owl.
// If an API key is set in Settings, Claude speaks. If not (or if the internet
// drops), the game uses the pre-written story text, so it always works.

const CLAUDE_MODEL = 'claude-opus-5-5';
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.132.1/+esm';

const DM_SYSTEM = `You are the Dungeon Master for "First Quest", a beginner-friendly D&D adventure.
A party of 3-4 real people is sitting around one iPad, reading your words together.

Voice: a dramatic, epic fantasy storyteller. Warm, vivid, a little funny, family-friendly.

Rules:
- Write 1-2 short paragraphs, under 110 words in total. Plain prose: no headings, lists or markdown.
- Speak to the heroes in second person and use their names. Use each hero's stated pronouns; if unsure, use their name.
- You are given the KEY FACTS of this moment. Keep every fact, including who succeeded or failed. Never change a roll's result.
- Never decide what a hero says, thinks or feels. Describe the world and the consequences.
- Stay inside this scene. Don't invent new quests or skip ahead in the story.`;

const PIP_SYSTEM = `You are Pip, a cheeky but kind owl who mentors brand-new D&D players during their very first adventure.
The players are total beginners sitting around one iPad.

Answer the question in under 90 words, in plain everyday language, with a tiny example from the current scene when it helps.
Use D&D 5th edition rules. This app simplifies some rules (no spell slots, no saving throws, heroes recover at 1 HP each scene, powers are once per adventure); say so when it matters.
If asked for strategy, give two short options rather than one answer, so the players still choose. No markdown headings.`;

let claudeClient = null;

function aiEnabled() {
  const settings = loadSettings();
  return settings.useAI && settings.apiKey.trim().length > 0;
}

async function getClient() {
  if (claudeClient) return claudeClient;
  const sdk = await import(SDK_URL);
  const Anthropic = sdk.default || sdk.Anthropic;
  // The key is typed in by the player and only ever kept on this device.
  claudeClient = new Anthropic({ apiKey: loadSettings().apiKey.trim(), dangerouslyAllowBrowser: true });
  return claudeClient;
}

function resetClaudeClient() { claudeClient = null; }

async function askClaude(system, userText) {
  const client = await getClient();
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    output_config: { effort: 'low' },
    // If a request is ever declined, the API retries it on a fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: userText }],
  });
  if (response.stop_reason === 'refusal') throw new Error('The narrator declined that request.');
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!text) throw new Error('The narrator had nothing to say.');
  return text;
}

function partySummary(party) {
  return party.map(h =>
    `- ${h.name} (${h.pronouns}), ${RACES[h.race].name} ${CLASSES[h.cls].name}, played by ${h.player || 'a player'}. ` +
    `HP ${h.hp}/${h.maxHp}${h.down ? ', knocked out' : ''}.${h.look ? ' Looks: ' + h.look : ''}`
  ).join('\n');
}

function recentStory(log) {
  return log.filter(e => e.kind === 'dm' || e.kind === 'player')
    .slice(-8)
    .map(e => e.kind === 'player' ? `${e.speaker}: "${e.text}"` : e.text)
    .join('\n\n');
}

// Ask the DM to narrate a moment. `facts` is the offline text, which doubles
// as the list of things Claude must keep true.
async function dmNarrate(game, facts, brief) {
  if (!aiEnabled()) return { text: facts, ai: false };
  const prompt = [
    'THE PARTY:', partySummary(game.party), '',
    'THE STORY SO FAR:', recentStory(game.log) || '(the adventure is just beginning)', '',
    'SCENE:', brief, '',
    'KEY FACTS OF THIS MOMENT (keep all of them):', facts, '',
    'Narrate this moment now.',
  ].join('\n');
  try {
    return { text: await askClaude(DM_SYSTEM, prompt), ai: true };
  } catch (err) {
    console.warn('AI narrator unavailable, using the written story.', err);
    return { text: facts, ai: false, error: err.message };
  }
}

function pipOffline(question) {
  const q = question.toLowerCase();
  // Prefer the longest matching keyword so "group check" beats "check".
  let best = null, bestLen = 0;
  for (const entry of GLOSSARY) {
    for (const key of entry.keys) {
      if (q.includes(key) && key.length > bestLen) { best = entry; bestLen = key.length; }
    }
  }
  return best ? best.answer : PIP_FALLBACK;
}

async function pipAnswer(game, question) {
  if (!aiEnabled()) return { text: pipOffline(question), ai: false };
  const scene = STORY[game.sceneIndex];
  const prompt = [
    'Current scene: ' + (scene ? scene.title + '. ' + scene.brief : 'Creating characters.'),
    'Party:', partySummary(game.party || []), '',
    'A player asks: ' + question,
  ].join('\n');
  try {
    return { text: await askClaude(PIP_SYSTEM, prompt), ai: true };
  } catch (err) {
    return { text: pipOffline(question), ai: false, error: err.message };
  }
}
