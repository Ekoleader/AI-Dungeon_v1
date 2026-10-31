# 🐉 First Quest

A beginner Dungeons & Dragons adventure for **3 or 4 players sharing one iPad** in the middle of the table. Each player makes a hero, then the party picks one of six 30-45 minute adventures, each in three acts. Pip the owl teaches the rules as they come up, and the party earns badges for each D&D idea they learn.

## The adventures

| Adventure | Style | Boss | Monsters you'll meet |
|---|---|---|---|
| 🏮 The Stolen Everlight | Classic fantasy | Grubnak the goblin chief | Goblins, goblin wolves |
| 🐀 The Ratmancer's Engine | Steampunk | The Ratmancer | Housecatfolk bandit, Goblin bombarder, Wyrmling, zombie rats |
| 🎪 Spores at the Steam Carnival | Steampunk | Mossmaw the Shroom druid | Deep gnome, Forest gnome, Forest guardian, spore zombies |
| 🥚 The Dragon's Egg Heist | Steampunk | Captain Shellbeard, Turtlefolk pirate | A brass dragon, Siren, Tiefling outlander |
| ⛏️ The Zombie Miners of Copperdeep | Steampunk | Grizzletooth the Goblin shaman | Deep gnome, Beer golem, zombie miners |
| 🕰️ The Midnight Clockwork Dragon | Steampunk | Vexira the Erinyes | Hell pugs, Lizardfolk assassin, a clockwork dragon, clockwork zombies |

The five steampunk adventures all happen in Brassport, a city of brass towers, airships and steam. Every adventure follows the same shape, so the rules stay familiar while the story changes. Each one has a scene where learning the boss's **weakness** makes some boss moves easier, and a scene where winning someone over gives a **secret way in** (failing raises the alarm and makes the boss harder).

Monsters show emoji icons for now. To swap in a photo of a mini-figure later, add an `art: 'img/monsters/name.jpg'` line to that monster in `js/adventures.js`.

## How a game plays (The Stolen Everlight)

1. **Gather your party.** Pass the iPad around. Each player picks a name, race, class, sigil, colour and look, and can fill in a **Who is your hero?** section: backstory, motivation (why they adventure) and desire (what they want most), or tap 🎲 for ideas. When it's their turn, the game reminds them what drives their hero, and the AI Dungeon Master uses all three to describe them. A portrait is drawn from those choices. Players can also **bring back a saved hero** from an earlier adventure. Pip checks the party's balance.
2. **Act I · The Call.** Everyone introduces their hero in character, then one hero tries to win the trust of Maren, the shrine keeper.
3. **Act II · The Journey.** A group stealth check past goblin wolves, a broken bridge, a nervous goblin scout and a hidden trap. The spotlight rotates so every player leads a scene.
4. **Act III · The Climax.** Roll initiative and face Grubnak the goblin chief, taking turns in order. Earlier choices matter: Snik's secret door gives a head start, raising the alarm makes the fight harder, and learning that Grubnak fears fire makes fiery moves easier.

5. **After the quest.** Every hero earns XP, may level up, and the adventure is added to their record of deeds.

The D&D rules you'll learn along the way are ability checks, modifiers, Difficulty Class (DC), proficiency, Help and advantage, Inspiration, group checks, hit points, healing, natural 20s and 1s, initiative and turn order.

## Saved games and heroes

- **Pause:** tap **⏸ Pause** above the story. The adventure is saved exactly where you were, and the main menu shows it under *Paused adventures* with a **▶ Resume** button. You can keep several paused adventures. Starting a new party never throws away an unfinished one: it is paused automatically.
- **Hall of Heroes (🏰 on the main menu):** every hero lives on with their portrait, backstory, level, XP and a record of every adventure they've finished. Tap a hero to see their character sheet, edit their looks and backstory, or retire them.
- **Levelling up:** heroes get 300 XP for finishing an adventure, 100 more for beating the villain and 25 per successful roll. Levels go up to 5. Each level adds hit points and something new, like the Fighter's *Action Surge*, the Wizard's *Shield* or the Cleric's *Bless*. Tap a hero's portrait during play to see their abilities.
- **Painted portraits:** eight race and class pairs have painted steampunk portraits (in `img/heroes/`): Dwarf Cleric, Dwarf Fighter, Elf Rogue, Elf Wizard, Halfling Rogue, Halfling Wizard, Human Cleric and Human Fighter. To add another, save a square picture as `img/heroes/race-class.jpg` and add a line to `HERO_ART` in `js/portrait.js`. A player can still pick ✏️ Drawn to design their own.
- **Drawn portraits** cover every other pair and are made by the game itself (free, offline). They follow race, class and colour, the skin and hair picks, and words in the description: try *beard*, *freckles*, *scar*, *glasses*, *eyepatch*, *grin* or *grumpy*.
- **Backups:** everything is stored only in this iPad's Safari. In ⚙️ **Settings → Backup** (or the Hall of Heroes), tap **💾 Export a backup** now and then; the file lands in the Files app under Downloads. **📂 Import a backup** restores it or moves your heroes to another device. Importing adds to what's there and never deletes anything. Your API key is never put in the file.

> Clearing Safari's website data, or not opening the game for many weeks, can erase what's stored on the iPad. That's what the backup file is for.

## Playing it

**Live game:** https://ekoleader.github.io/AI-Dungeon_v1/ (works once GitHub Pages is switched on, see below).

**On a computer:** you can also just double-click `index.html` in a downloaded copy.

### Publishing with GitHub Pages (one-time setup)

1. On GitHub, open this repository and click **Settings** (the gear tab along the top).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose `main` and `/ (root)`, then click **Save**.
5. Wait 1-2 minutes, then refresh the Pages screen. It shows a "Your site is live at..." link.

Every time new files land on `main`, the site updates itself within a minute or two.

### Putting it on the iPad

1. Open the live link in **Safari** on the iPad.
2. Tap the **Share** button, then **Add to Home Screen**.
3. Now First Quest opens full-screen from its own icon, like a real app, and the screen stays awake while you play.

## The AI Dungeon Master (optional)

Out of the box the game uses its own written story, so it works with no setup. To have **Claude** narrate instead (and let Pip answer *any* question), connect it to your Anthropic account:

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up or log in.
2. Open **Billing** (under Settings) and add some credit. A few dollars covers lots of game nights.
3. Optional but smart: in **Limits**, set a monthly spend limit so a mistake can never cost much.
4. Open **API Keys** and click **Create Key**. Name it something like `iPad First Quest` and copy it straight away (it's only shown once). It starts with `sk-ant-`.
5. On the iPad, open the game, tap ⚙️ **Settings**, paste the key, tick **Use the AI Dungeon Master**, tap **Test connection**, then **Save**.

### Hearing the narrator

The iPad reads the Dungeon Master's story and Pip's answers aloud using its built-in voices, which are free and need no key. Tap 🔊 in the top bar to mute or unmute, or tap 🔊 next to any line of the story to hear it again. Under ⚙️ **Settings → Narrator voice** you can pick a voice and a speed.

If you hear nothing: turn the iPad's volume up, make sure Silent mode is off (swipe down to Control Center), and tap anywhere in the game once, since Safari only allows sound after a tap. For richer voices, go to the iPad's **Settings → Accessibility → Spoken Content → Voices → English** and download an "Enhanced" or "Premium" voice. It will then show up in the game's voice list.

### Keeping your key safe

- The key is saved **only in that iPad's browser**. It is never added to this repository, so the public website doesn't contain it. Anyone else who visits the site plays with the written story, or adds their own key.
- **Never** paste the key into any file on GitHub. Public repositories are scanned by bots, and a leaked key gets used by strangers.
- Only enter your key on your own device. If you ever think it leaked, delete it in the Console's **API Keys** page and create a new one.

Claude is handed each scene's written text as "key facts" and asked to retell it dramatically, so the story, the dice results and the consequences always stay the same. If the internet drops or the key is wrong, the game quietly falls back to the written story. It uses the `claude-opus-5-5` model; for a cheaper narrator, change `CLAUDE_MODEL` in `js/narrator.js` to `claude-haiku-5-5`.

## A tour of the code (for learning)

| File | What it does | Good first experiment |
|---|---|---|
| `index.html` | The skeleton of the page: the top bar, the empty `<main>` the game draws into, and the script tags. | Change the `<title>`. |
| `css/style.css` | All the looks. Colours are variables at the very top (`--burgundy`, `--gold`...). | Change `--burgundy` to a blue and watch the whole game re-theme. |
| `js/data.js` | The **content**: races, classes, skills, the Everlight story, badges and Pip's answers. No logic, just words and numbers. | Add a new choice to a scene, or a new race. |
| `js/adventures.js` | The other five adventures, the monster list and the boss settings the picker shows. | Change a boss's weakness by moving `weakDc` onto a different move. |
| `js/state.js` | The game's memory: one `game` object, saved to `localStorage` after every change, plus the hero maths (`mod()`, `skillBonus()`, `buildHero()`). | Change a class's starting `scores` in `data.js` and see the HP change. |
| `js/roster.js` | Heroes that live on between adventures: XP, levels and what each class unlocks (`LEVEL_PERKS`), paused adventures, and the backup file. | Give the Wizard a new level 2 ability in `LEVEL_PERKS`. |
| `js/portrait.js` | Draws each hero's portrait as an SVG picture from their race, class, colour and description. | Add a new word to `LOOK_WORDS`, like *tattoo*, and draw it. |
| `js/dice.js` | Rolling dice (advantage, Halfling luck) and the spinning-die animation. | Make the animation longer by changing `duration`. |
| `js/narrator.js` | Talks to Claude for the DM and Pip, with the offline fallbacks. | Rewrite `DM_SYSTEM` to make the narrator a pirate. |
| `js/voice.js` | Reads the story aloud with the browser's built-in speech (Web Speech API). | Change Pip's `pitch` to make the owl squeakier. |
| `js/app.js` | The game itself: draws each screen with `render()` and handles every tap through `data-action` attributes. | Find `case 'roll':` and follow what happens when you roll. |

### Simplified rules (on purpose)

To keep a first session smooth, a few D&D rules are simplified: a natural 20 always succeeds and a natural 1 always fails on checks; knocked-out heroes get back up at 1 HP at the next scene; special abilities like Second Wind, Cure Wounds and Bless are once per adventure; levels stop at 5 and use a quicker XP table than the books; there are no spell slots or saving throws. Pip mentions this when it matters.

## Ideas for what to build next

- Sound effects for dice and a background music toggle.
- A "DM mode" that shows one player the DCs and secrets, so someone can learn to run the game.
