// voice.js — reads the story aloud using the browser's built-in speech
// (the Web Speech API). No API key or extra cost: the iPad's own voices do it.
//
// iPad Safari only allows speech after a person taps something, so the first
// tap anywhere "unlocks" the voice. After that the narrator can speak freely.

const voice = {
  unlocked: false,
  voices: [],
  supported: 'speechSynthesis' in window,
};

function loadVoices() {
  if (!voice.supported) return;
  // English voices only, since the story is in English.
  voice.voices = speechSynthesis.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang));
}

if (voice.supported) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

// Pick a voice: the one chosen in Settings, otherwise a good storyteller default.
function pickVoice(name) {
  if (!voice.voices.length) loadVoices();
  const byName = voice.voices.find(v => v.name === name);
  if (byName) return byName;
  const favourites = ['Daniel', 'Arthur', 'Oliver', 'Gordon', 'Karen', 'Serena', 'Samantha'];
  for (const fav of favourites) {
    const v = voice.voices.find(x => x.name.startsWith(fav));
    if (v) return v;
  }
  return voice.voices[0] || null;
}

// Called on the first tap. Speaking a silent utterance inside a tap is what
// tells iPad Safari "the person wants sound".
function unlockVoice() {
  if (!voice.supported || voice.unlocked) return;
  const hello = new SpeechSynthesisUtterance(' ');
  hello.volume = 0;
  speechSynthesis.speak(hello);
  voice.unlocked = true;
}

function stopSpeaking() {
  if (voice.supported) speechSynthesis.cancel();
}

// Turn story text into something nice to listen to: no emoji, no "(1 damage)" brackets read awkwardly.
function cleanForSpeech(text) {
  return String(text)
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[“”"]/g, '')
    .replace(/\bHP\b/g, 'hit points')
    .replace(/\bDC\b/g, 'difficulty')
    .replace(/\s+/g, ' ')
    .trim();
}

// Speak text aloud. `who` is 'dm' (deep, slow storyteller) or 'pip' (a perkier owl).
// Long text is split into sentences because some browsers cut off long speeches.
function speak(text, who = 'dm') {
  const settings = loadSettings();
  if (!voice.supported || !settings.voiceOn) return;
  stopSpeaking();
  const chosen = pickVoice(settings.voiceName);
  const sentences = cleanForSpeech(text).match(/[^.!?]+[.!?]*["')\]]*\s*/g) || [];
  // Group sentences into chunks of roughly 200 characters.
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > 200 && current) { chunks.push(current); current = ''; }
    current += s;
  }
  if (current.trim()) chunks.push(current);

  const rate = Number(settings.voiceRate) || 0.95;
  chunks.forEach(chunk => {
    const u = new SpeechSynthesisUtterance(chunk.trim());
    if (chosen) { u.voice = chosen; u.lang = chosen.lang; }
    u.rate = who === 'pip' ? rate * 1.08 : rate;
    u.pitch = who === 'pip' ? 1.45 : 0.85;
    speechSynthesis.speak(u);
  });
}
