# 🐉 First Quest

A beginner Dungeons & Dragons adventure for **3 or 4 players sharing one iPad** in the middle of the table. Each player makes a hero, then the party plays *The Stolen Everlight*, a 30-45 minute adventure in three acts. Pip the owl teaches the rules as they come up, and the party earns badges for each D&D idea they learn.

## How a game plays

1. **Gather your party.** Pass the iPad around. Each player picks a name, race, class, sigil, colour and look. Pip checks the party's balance.
2. **Act I · The Call.** Everyone introduces their hero in character, then one hero tries to win the trust of Maren, the shrine keeper.
3. **Act II · The Journey.** A group stealth check past goblin wolves, a broken bridge, a nervous goblin scout and a hidden trap. The spotlight rotates so every player leads a scene.
4. **Act III · The Climax.** Roll initiative and face Grubnak the goblin chief, taking turns in order. Earlier choices matter: Snik's secret door gives a head start, raising the alarm makes the fight harder, and learning that Grubnak fears fire makes fiery moves easier.

The D&D rules you'll learn along the way are ability checks, modifiers, Difficulty Class (DC), proficiency, Help and advantage, Inspiration, group checks, hit points, healing, natural 20s and 1s, initiative and turn order.

## Running it

**On a computer:** double-click `index.html`. That's it.

**On the iPad:** an iPad can't open files straight from a folder, so the game needs to live on a website. The free, beginner-friendly way to do that is **GitHub Pages**:

1. Make a free account at github.com and create a new **public** repository called `first-quest`.
2. Click **Add file → Upload files** and drag in everything from this folder (`index.html`, `css/`, `js/`, this README).
3. Go to **Settings → Pages**, set *Source* to `Deploy from a branch`, pick `main` and `/ (root)`, then save.
4. After a minute your game is live at `https://YOUR-NAME.github.io/first-quest/`.
5. Open that link in Safari on the iPad, tap **Share → Add to Home Screen**. Now it opens full-screen like a real app, and the screen stays awake while you play.

## The AI Dungeon Master (optional)

Out of the box the game uses its own written story, so it works with no setup and no internet beyond loading the page. To have **Claude** narrate instead (and let Pip answer *any* question):

1. Get an API key at [console.anthropic.com](https://console.anthropic.com) and add a little credit.
2. In the game, tap ⚙️ **Settings**, paste the key, tick **Use the AI Dungeon Master**, and tap **Test connection**.

The key is saved only in that iPad's browser. Because the browser talks to Claude directly, **only put your own key on your own device**, and never hard-code it into the files you upload to GitHub.

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
| `js/app.js` | The game itself: draws each screen with `render()` and handles every tap through `data-action` attributes. | Find `case 'roll':` and follow what happens when you roll. |

### Simplified rules (on purpose)

To keep a first session smooth, a few D&D rules are simplified: a natural 20 always succeeds and a natural 1 always fails on checks; knocked-out heroes get back up at 1 HP at the next scene; Second Wind and Cure Wounds are once per adventure; there are no spell slots or saving throws. Pip mentions this when it matters.

## Ideas for what to build next

- A second adventure, so a party can keep their heroes and **level up**.
- Sound effects for dice and a background music toggle.
- Spoken narration on the iPad using the browser's built-in text-to-speech.
- A "DM mode" that shows one player the DCs and secrets, so someone can learn to run the game.
