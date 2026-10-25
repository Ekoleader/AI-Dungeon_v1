// data.js — all the "content" of the game lives here: races, classes, skills,
// the story, badges and Pip's glossary. Changing the game's words or numbers
// usually means editing only this file.

const ABILITIES = {
  str: { name: 'Strength', short: 'STR', blurb: 'Muscle. Lifting, jumping, hitting hard.' },
  dex: { name: 'Dexterity', short: 'DEX', blurb: 'Speed and balance. Sneaking, dodging, quick hands.' },
  con: { name: 'Constitution', short: 'CON', blurb: 'Toughness. More of it means more hit points.' },
  int: { name: 'Intelligence', short: 'INT', blurb: 'Book smarts. Magic lore, puzzles, investigating.' },
  wis: { name: 'Wisdom', short: 'WIS', blurb: 'Awareness. Noticing things, reading people, faith.' },
  cha: { name: 'Charisma', short: 'CHA', blurb: 'Force of personality. Persuading, lying, inspiring.' },
};

const SKILLS = {
  athletics:    { name: 'Athletics',       ability: 'str' },
  acrobatics:   { name: 'Acrobatics',      ability: 'dex' },
  stealth:      { name: 'Stealth',         ability: 'dex' },
  sleight:      { name: 'Sleight of Hand', ability: 'dex' },
  arcana:       { name: 'Arcana',          ability: 'int' },
  investigation:{ name: 'Investigation',   ability: 'int' },
  religion:     { name: 'Religion',        ability: 'int' },
  insight:      { name: 'Insight',         ability: 'wis' },
  perception:   { name: 'Perception',      ability: 'wis' },
  medicine:     { name: 'Medicine',        ability: 'wis' },
  persuasion:   { name: 'Persuasion',      ability: 'cha' },
  deception:    { name: 'Deception',       ability: 'cha' },
  intimidation: { name: 'Intimidation',    ability: 'cha' },
};

// Simplified rules: each race adds a bonus on top of the class's scores.
const RACES = {
  human:    { name: 'Human',    bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
              blurb: 'Adaptable and ambitious. +1 to every ability.' },
  elf:      { name: 'Elf',      bonus: { dex: 2, wis: 1 },
              blurb: 'Graceful and sharp-eyed. +2 Dexterity, +1 Wisdom.' },
  dwarf:    { name: 'Dwarf',    bonus: { con: 2, str: 1 },
              blurb: 'Tough as the mountains. +2 Constitution, +1 Strength.' },
  halfling: { name: 'Halfling', bonus: { dex: 2, cha: 1 },
              blurb: 'Small, brave and lucky. +2 Dexterity, +1 Charisma. Lucky: rolling a 1 gets an automatic reroll.' },
};

const CLASSES = {
  fighter: {
    name: 'Fighter', role: 'Protector', hitDie: 10,
    scores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    skills: ['athletics', 'intimidation', 'perception'],
    power: { id: 'secondWind', name: 'Second Wind', blurb: 'Once per adventure, heal yourself 1d10 + 1 HP.' },
    blurb: 'Master of weapons and armour. Stands in front so friends don\'t have to.',
  },
  wizard: {
    name: 'Wizard', role: 'Spellcaster', hitDie: 6,
    scores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    skills: ['arcana', 'investigation', 'insight'],
    power: null,
    blurb: 'Studies spellbooks to bend reality. Fragile, but clever and powerful.',
  },
  rogue: {
    name: 'Rogue', role: 'Sneak', hitDie: 8,
    scores: { str: 8, dex: 15, con: 13, int: 10, wis: 12, cha: 14 },
    skills: ['stealth', 'acrobatics', 'sleight', 'deception'],
    power: null,
    blurb: 'Quiet feet, quick hands. Solves problems before anyone notices.',
  },
  cleric: {
    name: 'Cleric', role: 'Healer', hitDie: 8,
    scores: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 },
    skills: ['religion', 'medicine', 'persuasion', 'insight'],
    power: { id: 'cureWounds', name: 'Cure Wounds', blurb: 'Once per adventure, heal any hero 1d8 + Wisdom modifier HP.' },
    blurb: 'Channels divine power to heal friends and smite foes.',
  },
};

const SIGILS = ['🛡️', '⚔️', '🔥', '🌙', '🍀', '🐺', '🦉', '⭐', '🗡️', '🌿', '💎', '🐉'];
const COLORS = ['#8b1e2d', '#1f4e79', '#2f6b3a', '#6b3fa0', '#b5651d', '#2a7f7f', '#7a6a1f', '#444b5a'];

const NAME_IDEAS = {
  human: ['Rowan', 'Elsa', 'Bram', 'Tamsin', 'Gareth', 'Wren'],
  elf: ['Sylvaris', 'Aeliana', 'Thalion', 'Liriel', 'Fenwick', 'Naeris'],
  dwarf: ['Bruni', 'Thorga', 'Dain', 'Helka', 'Grimbold', 'Ostra'],
  halfling: ['Pip', 'Merry', 'Tobin', 'Rosie', 'Bilwick', 'Lavender'],
};

// ---------------------------------------------------------------------------
// The adventure: "The Stolen Everlight". Three acts, eight scenes.
// Tokens in text: {hero} = spotlight hero, {party} = everyone's names.
// Scene types: intro, solo, group, boss, epilogue.
// ---------------------------------------------------------------------------
const STORY = [
  {
    id: 'tavern', act: 1, actTitle: 'Act I · The Call', title: 'The Gilded Goose', type: 'intro',
    narration: 'Rain hammers the shutters of the Gilded Goose, the only tavern in the sleepy village of Mossbrook. Tonight the whole village is dark, because the Everlight, the enchanted lantern that has guarded Mossbrook for a hundred years, was stolen from its shrine at dusk.\n\nAround one crooked table sit strangers who are about to become legends: {party}.',
    brief: 'Opening scene. The heroes are strangers in a rainy village tavern on the night the magic Everlight lantern was stolen. Set the mood and invite each hero to introduce themselves.',
    tip: { title: 'Roleplay & the spotlight', text: 'Each hero gets a moment to introduce themselves. Speak as your character, out loud if you like! In D&D the "spotlight" is whose turn it is to shine. This app passes it around so every player gets their moment.' },
  },
  {
    id: 'stranger', act: 1, title: 'The Hooded Stranger', type: 'solo',
    narration: 'A hooded figure slides into the seat beside you, smelling of pine and woodsmoke. She lowers her hood: Maren, keeper of the shrine, eyes red from crying.\n\n"Goblins took the Everlight," she whispers. "Their tracks lead into the Whisperwood. But I don\'t trust easily... why should I trust you?" She is looking straight at {hero}.',
    brief: 'Maren the shrine keeper asks the spotlight hero why she should trust the party. The goblins went into the Whisperwood.',
    tip: { title: 'Ability checks', text: 'When the outcome is uncertain, the DM asks for an ability check. Roll a d20, add your modifier, and try to meet or beat the Difficulty Class (DC). DC 10 is easy, 15 is hard, 20 is heroic.' },
    choices: [
      { label: 'Promise to help, from the heart', skill: 'persuasion', dc: 10, reward: 'inspiration',
        success: 'Maren\'s shoulders loosen. She presses a silver acorn into {hero}\'s palm. "For luck. And know this: the goblin chief, Grubnak, is terrified of fire." The party gains Inspiration!',
        fail: 'Maren studies {hero} for a long moment, then sighs. "I have no one else. Follow the broken branches into the Whisperwood." She vanishes into the rain.' },
      { label: 'Read her face for what she\'s hiding', skill: 'insight', dc: 10, reward: 'inspiration',
        success: '{hero} spots the guilt behind her tears. Maren confesses she left the shrine unlocked. Grateful to be understood, she shares a secret: "Grubnak, their chief, is terrified of fire." The party gains Inspiration!',
        fail: 'Her face is a closed door. "Just bring it back," Maren mutters, pointing toward the Whisperwood, and leaves.' },
      { label: 'Bluff: "We\'re famous monster hunters"', skill: 'deception', dc: 12, reward: 'inspiration',
        success: 'Maren\'s eyes go wide. "THE monster hunters? Then you\'ll want to know Grubnak, their chief, is terrified of fire!" The party gains Inspiration!',
        fail: 'Maren raises an eyebrow. "Famous? I\'ve never heard of you." Still, she points the way into the Whisperwood before leaving.' },
    ],
  },
  {
    id: 'forest', act: 2, actTitle: 'Act II · The Journey', title: 'The Whisperwood', type: 'group',
    skill: 'stealth', dc: 10,
    narration: 'The Whisperwood swallows the moonlight. Ahead, something large snuffles through the ferns: goblin wolves on patrol, three of them, noses to the ground.\n\nEveryone needs to slip past without a sound.',
    brief: 'The whole party must sneak past goblin wolves in a dark forest.',
    tip: { title: 'Group checks', text: 'When everyone attempts the same thing, the DM calls a group check. Everyone rolls. If at least half the party succeeds, the whole group succeeds. Sneaky friends can carry clumsy ones!' },
    success: 'Like ghosts, the party slides between the trees. The wolves sniff, grumble, and pad away into the dark.',
    fail: 'SNAP! A twig breaks underfoot. The wolves howl and the party sprints, crashing through brambles until the howls fade. Everyone is scratched and bruised (1 damage each).',
  },
  {
    id: 'bridge', act: 2, title: 'The Broken Bridge', type: 'solo',
    narration: 'The trail ends at a gorge. A rope bridge once crossed it; now it dangles in tatters above a roaring river. Goblin footprints continue on the far side.\n\n{hero}, the party looks to you. How do we get across?',
    brief: 'The party reaches a gorge with a broken rope bridge. The spotlight hero decides how to cross.',
    tip: { title: 'Helping = advantage', text: 'Any hero can Help a friend before they roll. That gives advantage: roll two d20s and keep the higher one. Teamwork is the most powerful thing in D&D.' },
    choices: [
      { label: 'Leap the gap and tie a new rope', skill: 'athletics', dc: 12, damageOnFail: 4,
        success: '{hero} takes a running jump, sails over the gorge, and lands with a roll. Minutes later a new rope is tied fast and the whole party crosses.',
        fail: '{hero} makes the jump... barely, slamming into the far cliff before scrambling up. The rope gets tied, but it hurt.' },
      { label: 'Search for another way across', skill: 'investigation', dc: 10, damageOnFail: 4,
        success: '{hero} notices a fallen tree spanning the gorge just downstream, hidden by mist. The party strolls across like it\'s a garden path.',
        fail: 'After a long search, {hero} decides to climb down and wade the river. Everyone crosses, soaked, and {hero} takes a nasty knock from the rocks.' },
      { label: 'Hop across the rocks below', skill: 'acrobatics', dc: 12, damageOnFail: 4,
        success: 'Stone to stone, {hero} dances across the river, then guides everyone along the same path.',
        fail: 'A slippery rock sends {hero} into the icy water. Friends haul {hero} out on the far bank, coughing.' },
      { label: 'Weave a spell to mend the rope', skill: 'arcana', dc: 10, onlyFor: ['wizard'], damageOnFail: 4,
        success: 'Glowing runes crawl along the frayed ropes and knit them whole. The bridge sways, but holds.',
        fail: 'The spell sputters. The rope mends halfway, and {hero} crosses first to test it... and nearly falls.' },
      { label: 'Pray for a sign', skill: 'religion', dc: 10, onlyFor: ['cleric'], damageOnFail: 4,
        success: 'A shaft of moonlight falls on stepping stones nobody noticed before. The gods have a sense of humour.',
        fail: 'No sign comes. {hero} leads the climb down the rocks instead and slips on the way.' },
    ],
  },
  {
    id: 'scout', act: 2, title: 'The Goblin Scout', type: 'solo',
    narration: 'Past the gorge, a scrawny goblin bursts out of a bush and nearly runs into the party. He clutches a spear twice his height and points it, trembling, at {hero}.\n\n"S-stay back! Snik is VERY dangerous!"',
    brief: 'A nervous goblin scout named Snik blocks the path and points a spear at the spotlight hero.',
    tip: { title: 'Failing forward', text: 'Failing a roll doesn\'t end the story; it just changes it. Good DMs turn failures into complications, not dead ends. Don\'t fear the dice!' },
    choices: [
      { label: 'Scare him into talking', skill: 'intimidation', dc: 10, reward: 'secret',
        success: 'Snik drops his spear with a squeak. "Back door! There\'s a back door behind the big mushroom! Please don\'t eat Snik!" The party knows a sneaky way into the goblin camp.',
        fail: 'Snik shrieks and bolts toward the goblin camp. "INTRUDERS! INTRUDERS!" The goblins will be ready for you.' },
      { label: 'Calm him with kindness', skill: 'persuasion', dc: 12, reward: 'secret',
        success: 'Snik lowers the spear and sniffles. "Grubnak is mean to Snik." He shows the party a secret back door into the camp.',
        fail: 'Snik isn\'t buying it. He scampers off to warn the camp, yelling about "the nice ones being the WORST ones".' },
      { label: 'Trick him: "We\'re Grubnak\'s new guards"', skill: 'deception', dc: 12, reward: 'secret',
        success: '"Oh! Sorry, bosses!" Snik salutes with the wrong hand and leads you straight to the camp\'s back door.',
        fail: 'Snik squints. "Grubnak doesn\'t HAVE guards that smell like soap!" He runs to raise the alarm.' },
    ],
  },
  {
    id: 'trap', act: 2, title: 'The Hollow Hill', type: 'solo',
    narration: 'The goblin camp lies inside a hollow hill. Torchlight flickers from the entrance. The ground in front of it looks... strangely tidy, for goblins.\n\n{hero} is in front.',
    brief: 'At the entrance to the goblin lair the ground looks suspiciously tidy (a hidden trap). The spotlight hero is in front.',
    tip: { title: 'Hit points', text: 'Hit points (HP) measure how much punishment a hero can take. At 0 HP a hero falls unconscious. A Cleric\'s Cure Wounds or a Fighter\'s Second Wind can heal; find those buttons on the hero cards.' },
    choices: [
      { label: 'Search carefully for traps', skill: 'perception', dc: 12, damageOnFail: 6,
        success: '{hero} spots a thin tripwire and a pit hidden under leaves. The party steps around it with smug grins.',
        fail: 'CLICK. A snare whips around {hero}\'s ankle and hoists them upside down into a thorn bush! Friends cut {hero} free, scratched and dizzy.' },
      { label: 'Poke ahead with a long stick', skill: 'investigation', dc: 10, damageOnFail: 6,
        success: 'The stick sinks through the leaves into a spiked pit. {hero} tosses it aside: "Goblins. So predictable."',
        fail: 'The stick finds nothing, but {hero}\'s next step finds the pit. Ouch.' },
      { label: 'Disarm whatever\'s hidden', skill: 'sleight', dc: 10, onlyFor: ['rogue'], damageOnFail: 6,
        success: 'With a few delicate snips, {hero} disarms the trap and pockets a rather nice piece of wire.',
        fail: 'The trap goes off in {hero}\'s hands. Nothing\'s broken, but it really stings.' },
    ],
  },
  {
    id: 'boss', act: 3, actTitle: 'Act III · The Climax', title: 'Grubnak\'s Throne', type: 'boss',
    narration: 'In a cavern lit by stolen candles, Grubnak the goblin chief sits on a throne of crates, the Everlight blazing in his grubby claws. "MINE!" he shrieks. "Shiny is MINE!"\n\nHis guards scatter. Grubnak raises a rusty cleaver. Roll for initiative!',
    brief: 'The final showdown with Grubnak the goblin chief, who holds the Everlight lantern in a candlelit cavern. Grubnak is cowardly and terrified of fire.',
    tip: { title: 'Initiative & turns', text: 'In a fight, everyone rolls initiative (d20 + Dexterity modifier). Highest goes first, then take turns in order. Here the party needs successes before Grubnak lands 3 hits. Mix attacks, tricks, talking and Help!' },
    actions: [
      { id: 'charge', label: 'Charge with your weapon', skill: 'athletics', dc: 12, onlyFor: ['fighter'] },
      { id: 'firebolt', label: 'Hurl a Fire Bolt', skill: 'arcana', dc: 12, onlyFor: ['wizard'], fireDc: 9 },
      { id: 'sneak', label: 'Slip behind him for the lantern', skill: 'stealth', dc: 12, onlyFor: ['rogue'] },
      { id: 'flame', label: 'Call down Sacred Flame', skill: 'religion', dc: 12, onlyFor: ['cleric'], fireDc: 9 },
      { id: 'torch', label: 'Wave a torch in his face', skill: 'intimidation', dc: 13, fireDc: 10 },
      { id: 'talk', label: 'Talk him into giving up', skill: 'persuasion', dc: 14 },
      { id: 'help', label: 'Help a friend (next hero gets advantage)', help: true },
    ],
    victory: 'With one final blow, Grubnak yelps, drops the Everlight, and flees squealing into the tunnels. {hero} catches the lantern, and its golden light fills the cavern. The goblins won\'t be back any time soon.',
    defeat: 'With a cackle, Grubnak hurls the Everlight across the cavern and dives into a tunnel. {hero} catches it inches from the stone floor! The lantern is saved, but Grubnak escapes to make trouble another day.',
  },
  {
    id: 'epilogue', act: 3, title: 'Dawn over Mossbrook', type: 'epilogue',
    narration: 'Dawn breaks over Mossbrook as the party returns, the Everlight glowing gold in their hands. Maren weeps with joy. The villagers pour out of their homes, cheering the names of {party}.\n\nStrangers last night. A party now. And this was only the beginning.',
    brief: 'The heroes return the Everlight to Mossbrook at dawn and are cheered by the villagers. Celebrate each hero by name.',
    tip: { title: 'What comes next', text: 'After an adventure, heroes level up: more HP, new abilities, new spells. You\'ve now done everything a real D&D session does: roleplay, ability checks, group checks, advantage, damage, healing and initiative. You\'re ready for a real table!' },
  },
];

const BADGES = {
  fellowship:   { icon: '🤝', name: 'Fellowship Formed', lesson: 'A party is a team of heroes with different strengths.' },
  firstRoll:    { icon: '🎲', name: 'First Roll',        lesson: 'Ability check: d20 + modifier vs a Difficulty Class.' },
  roleplay:     { icon: '🎭', name: 'In Character',      lesson: 'Roleplay: speaking and acting as your hero.' },
  nat20:        { icon: '🌟', name: 'Natural 20!',       lesson: 'Rolling a 20 on the die is a critical success.' },
  nat1:         { icon: '💀', name: 'Natural 1',         lesson: 'Rolling a 1 is a critical fumble. It happens to everyone!' },
  teamwork:     { icon: '🫱', name: 'Teamwork',          lesson: 'The Help action gives a friend advantage.' },
  inspired:     { icon: '✨', name: 'Inspired',          lesson: 'Inspiration can be spent for advantage on any roll.' },
  groupCheck:   { icon: '👣', name: 'All Together Now',  lesson: 'Group check: if half the party succeeds, everyone does.' },
  ouch:         { icon: '🩹', name: '\'Tis But a Scratch', lesson: 'Hit points measure how much harm a hero can take.' },
  healer:       { icon: '💚', name: 'Healing Hands',     lesson: 'Healing restores HP and can get a fallen friend back up.' },
  lucky:        { icon: '🍀', name: 'Halfling Luck',     lesson: 'Some races have special traits, like rerolling 1s.' },
  initiative:   { icon: '⚡', name: 'Roll for Initiative!', lesson: 'Initiative decides the order of turns in a fight.' },
  everyone:     { icon: '🌈', name: 'Everyone Shines',   lesson: 'A good table gives every player the spotlight.' },
  curious:      { icon: '🦉', name: 'Curious Mind',      lesson: 'Asking questions is how every great player learned.' },
  questDone:    { icon: '🏆', name: 'Quest Complete',    lesson: 'You finished a full adventure, start to end!' },
};

// Pip's offline answers. Keys are words to look for in a question.
const GLOSSARY = [
  { keys: ['ability check', 'check', 'roll for'], answer: 'An ability check is how D&D decides if something tricky works. Roll a d20, add your modifier for the right skill, and compare to the DC. Meet or beat it and you succeed!' },
  { keys: ['modifier', 'bonus', '+'], answer: 'A modifier is the number you add to a roll. It comes from your ability score: (score − 10) ÷ 2, rounded down. A 14 gives +2, an 8 gives −1. If you\'re trained (proficient) in a skill, add +2 more.' },
  { keys: ['dc', 'difficulty'], answer: 'DC means Difficulty Class: the number you need to reach. 5 is very easy, 10 easy, 15 hard, 20 very hard. The DM sets it based on how tricky the task is.' },
  { keys: ['advantage'], answer: 'Advantage means roll two d20s and keep the higher one. You get it when a friend Helps you, or by spending Inspiration. It\'s like a big bonus without changing the numbers.' },
  { keys: ['disadvantage'], answer: 'Disadvantage is the opposite of advantage: roll two d20s and keep the lower one. It happens when something makes a task harder, like trying to sneak in clanky armour.' },
  { keys: ['proficien', 'trained', 'skill'], answer: 'Each class is trained (proficient) in some skills. Trained skills add a +2 proficiency bonus. Check the hero card: trained skills are the ones your class is good at.' },
  { keys: ['hp', 'hit point', 'health', 'damage', 'hurt'], answer: 'Hit points (HP) show how much harm a hero can take. Damage lowers them; healing raises them. At 0 HP a hero is knocked out until healed. In this app, fallen heroes also get back up at 1 HP at the next scene.' },
  { keys: ['heal', 'cure', 'second wind'], answer: 'Clerics can cast Cure Wounds to heal a friend. Fighters have Second Wind to heal themselves. Look for the glowing button on their hero cards. Each can be used once per adventure here.' },
  { keys: ['initiative', 'turn order', 'combat', 'fight'], answer: 'When a fight starts, everyone rolls initiative: d20 + Dexterity modifier. Highest goes first. Then everyone takes turns in that order, one action each.' },
  { keys: ['inspiration'], answer: 'Inspiration is a reward from the DM for great roleplay or clever thinking. Spend it on any roll to get advantage. Your party\'s Inspiration shows on the check panel.' },
  { keys: ['group check', 'group'], answer: 'In a group check everyone rolls for the same task. If at least half the party succeeds, the whole party succeeds. Great for sneaking or climbing together.' },
  { keys: ['natural 20', 'nat 20', 'crit', 'critical'], answer: 'A natural 20 means the die itself showed 20. On ability checks, many tables treat it as an amazing success. In combat it\'s a critical hit: double damage dice!' },
  { keys: ['natural 1', 'nat 1', 'fumble'], answer: 'A natural 1 means the die showed 1. It\'s usually a failure, often a funny one. Halflings are lucky: they reroll natural 1s!' },
  { keys: ['saving throw', 'save'], answer: 'A saving throw is a roll to resist something bad, like a trap or a spell. It works like an ability check, but you\'re reacting rather than choosing to act. This adventure skips them to keep things simple.' },
  { keys: ['spell', 'magic', 'cast'], answer: 'Wizards and Clerics cast spells. Real D&D uses spell slots, a limited number of spells per day. This beginner adventure keeps it simple: spells appear as special choices for those classes.' },
  { keys: ['strength', 'str'], answer: 'Strength is raw muscle: jumping, climbing, lifting, smashing. Fighters love it.' },
  { keys: ['dexterity', 'dex'], answer: 'Dexterity is speed and balance: sneaking, dodging, acrobatics and going first in a fight. Rogues love it.' },
  { keys: ['constitution', 'con'], answer: 'Constitution is toughness. A higher Constitution means more hit points. Dwarves are famous for it.' },
  { keys: ['intelligence', 'int'], answer: 'Intelligence is book smarts: magic lore, puzzles, investigating clues. Wizards love it.' },
  { keys: ['wisdom', 'wis'], answer: 'Wisdom is awareness and gut feeling: noticing traps, reading people, and divine magic. Clerics love it.' },
  { keys: ['charisma', 'cha'], answer: 'Charisma is force of personality: persuading, lying, intimidating, inspiring others.' },
  { keys: ['class'], answer: 'Your class is your hero\'s job: Fighter (weapons), Wizard (spellbooks), Rogue (stealth) or Cleric (divine healing). A good party mixes classes so someone is great at every kind of problem.' },
  { keys: ['race', 'species', 'elf', 'dwarf', 'halfling', 'human'], answer: 'Your race (newer books call it species) gives small bonuses: Elves are nimble, Dwarves are tough, Halflings are lucky, and Humans are a bit good at everything.' },
  { keys: ['dm', 'dungeon master', 'game master'], answer: 'The Dungeon Master describes the world, plays every monster and villager, and decides when you need to roll. Here the app is the DM, but one day that could be you!' },
  { keys: ['roleplay', 'in character', 'speak'], answer: 'Roleplaying means speaking and acting as your hero. Try a voice, describe what you do, react to the story. There\'s no wrong way to do it.' },
  { keys: ['strategy', 'hint', 'what should', 'which', 'best', 'help us'], answer: 'Hoo, a tactician! Check the hero cards: a skill your class is trained in gets +2, so the highest bonus has the best odds. Before a tough roll, have a friend Help for advantage, or spend Inspiration if you have it. And remember: failing just makes the story twistier.' },
  { keys: ['d20', 'dice', 'die'], answer: 'D&D uses many dice, named by their sides: d4, d6, d8, d10, d12 and d20. The d20 decides if you succeed. The smaller dice are mostly for damage and healing.' },
];

const PIP_FALLBACK = 'Hoo! Not sure about that one. Try asking about ability checks, advantage, hit points, initiative, classes or any of the six abilities. Add an API key in Settings and I can answer anything!';
