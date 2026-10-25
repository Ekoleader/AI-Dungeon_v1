# 🐉 First Quest

A beginner Dungeons & Dragons adventure for **3 or 4 players sharing one iPad** in the middle of the table. Each player makes a hero, then the party plays *The Stolen Everlight*, a 30-45 minute adventure in three acts. Pip the owl teaches the rules as they come up, and the party earns badges for each D&D idea they learn.

## How a game plays

1. **Gather your party.** Pass the iPad around. Each player picks a name, race, class, sigil, colour and look. Pip checks the party's balance.
2. **Act I · The Call.** Everyone introduces their hero in character, then one hero tries to win the trust of Maren, the shrine keeper.
3. **Act II · The Journey.** A group stealth check past goblin wolves, a broken bridge, a nervous goblin scout and a hidden trap. The spotlight rotates so every player leads a scene.
4. **Act III · The Climax.** Roll initiative and face Grubnak the goblin chief, taking turns in order. Earlier choices matter: Snik's secret door gives a head start, raising the alarm makes the fight harder, and learning that Grubnak fears fire makes fiery moves easier.

The D&D rules you'll learn along the way are ability checks, modifiers, Difficulty Class (DC), proficiency, Help and advantage, Inspiration, group checks, hit points, healing, natural 20s and 1s, initiative and turn order.

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
| `js/data.js` | The **content**: races, classes, skills, the whole story, badges and Pip's answers. No logic, just words and numbers. | Add a new choice to a scene, or a new race. |
| `js/state.js` | The game's memory: one `game` object, saved to `localStorage` after every change, plus the hero maths (`mod()`, `skillBonus()`). | Change a class's starting `scores` in `data.js` and see the HP change. |
| `js/dice.js` | Rolling dice (advantage, Halfling luck) and the spinning-die animation. | Make the animation longer by changing `duration`. |
| `js/narrator.js` | Talks to Claude for the DM and Pip, with the offline fallbacks. | Rewrite `DM_SYSTEM` to make the narrator a pirate. |
| `js/voice.js` | Reads the story aloud with the browser's built-in speech (Web Speech API). | Change Pip's `pitch` to make the owl squeakier. |
| `js/app.js` | The game itself: draws each screen with `render()` and handles every tap through `data-action` attributes. | Find `case 'roll':` and follow what happens when you roll. |

### Simplified rules (on purpose)

To keep a first session smooth, a few D&D rules are simplified: a natural 20 always succeeds and a natural 1 always fails on checks; knocked-out heroes get back up at 1 HP at the next scene; Second Wind and Cure Wounds are once per adventure; there are no spell slots or saving throws. Pip mentions this when it matters.

## Ideas for what to build next

- A second adventure, so a party can keep their heroes and **level up**.
- Sound effects for dice and a background music toggle.
- A "DM mode" that shows one player the DCs and secrets, so someone can learn to run the game.
