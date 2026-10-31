// portrait.js — draws each hero's portrait as a little SVG picture, built from
// their race, class, colour, a few picks (skin, hair) and words in their
// "what do they look like?" description. Free, instant, and works offline.

// Painted portraits for some race + class pairs (in img/heroes/). Heroes
// without one, or whose player picks "Drawn", get the SVG cartoon below.
const HERO_ART = {
  'dwarf-cleric': 'img/heroes/dwarf-cleric.jpg',
  'dwarf-fighter': 'img/heroes/dwarf-fighter.jpg',
  'elf-rogue': 'img/heroes/elf-rogue.jpg',
  'elf-wizard': 'img/heroes/elf-wizard.jpg',
  'halfling-rogue': 'img/heroes/halfling-rogue.jpg',
  'halfling-wizard': 'img/heroes/halfling-wizard.jpg',
  'human-cleric': 'img/heroes/human-cleric.jpg',
  'human-fighter': 'img/heroes/human-fighter.jpg',
};

function heroArt(hero) { return HERO_ART[`${hero.race}-${hero.cls}`] || null; }

// Painted art is used when it exists, unless the player chose the drawn style.
function usesArt(hero) { return Boolean(heroArt(hero)) && hero.portrait?.mode !== 'drawn'; }

const SKIN_TONES = ['#f8dcc8', '#eebf98', '#d39b6c', '#a96d45', '#7b4a2b', '#4f3020', '#a9c99a', '#9fb3d9'];

const HAIR_COLOURS = {
  black: '#1f1a1a', brown: '#5b3a22', auburn: '#8a3b1c', red: '#c2461f', blonde: '#e3bb52',
  white: '#f1efe9', grey: '#9b9a98', blue: '#3b6fd1', green: '#3f8f4f', purple: '#7b4bb3', pink: '#e27aa9',
};

const HAIR_STYLES = { short: 'Short', long: 'Long', braids: 'Braids', topknot: 'Top knot', bald: 'Bald' };

// Words in the description that change the picture.
const LOOK_WORDS = {
  hair: [
    [/\b(ginger|red|copper|fiery)[- ]?(hair|haired|curls|locks|beard|mane)?/i, 'red'],
    [/\bauburn/i, 'auburn'],
    [/\b(blond|blonde|golden|straw)/i, 'blonde'],
    [/\b(white|snowy)[- ](hair|haired|beard|locks)/i, 'white'],
    [/\b(grey|gray|silver)[- ]?(hair|haired|beard|locks)?/i, 'grey'],
    [/\b(black|raven|jet)[- ]?(hair|haired|beard|locks)?/i, 'black'],
    [/\b(brown|chestnut|mousy)[- ]?(hair|haired|beard|locks)?/i, 'brown'],
    [/\bblue[- ](hair|haired)/i, 'blue'],
    [/\bgreen[- ](hair|haired)/i, 'green'],
    [/\b(purple|violet)[- ](hair|haired)/i, 'purple'],
    [/\bpink[- ](hair|haired)/i, 'pink'],
  ],
  style: [
    [/\bbald|shaved head|no hair/i, 'bald'],
    [/\bbraid/i, 'braids'],
    [/\b(top ?knot|bun)\b/i, 'topknot'],
    [/\blong[- ](hair|locks)|flowing|wild hair|mane/i, 'long'],
    [/\bshort[- ]hair|cropped|buzz/i, 'short'],
  ],
  beard: /\bbeard|moustache|mustache|whiskers|stubble/i,
  noBeard: /\b(clean[- ]shaven|no beard|beardless)/i,
  scar: /\bscar/i,
  freckles: /\bfreckle/i,
  eyepatch: /\b(eye ?patch|one eye)/i,
  glasses: /\b(glasses|spectacles|monocle|goggles)/i,
  grin: /\b(grin|smil|cheer|happy|laugh)/i,
  frown: /\b(frown|grumpy|scowl|stern|serious|grim)/i,
};

// Combine the explicit picks with what the description says.
function portraitFeatures(hero) {
  const look = hero.look || '';
  const picks = hero.portrait || {};
  const f = {
    skin: picks.skin || SKIN_TONES[{ human: 1, elf: 0, dwarf: 2, halfling: 1 }[hero.race] ?? 1],
    hair: null, style: null,
    beard: hero.race === 'dwarf',
    scar: LOOK_WORDS.scar.test(look),
    freckles: LOOK_WORDS.freckles.test(look),
    eyepatch: LOOK_WORDS.eyepatch.test(look),
    glasses: LOOK_WORDS.glasses.test(look),
    mood: LOOK_WORDS.frown.test(look) ? 'frown' : LOOK_WORDS.grin.test(look) ? 'grin' : 'smile',
  };
  for (const [re, colour] of LOOK_WORDS.hair) if (re.test(look)) { f.hair = colour; break; }
  for (const [re, style] of LOOK_WORDS.style) if (re.test(look)) { f.style = style; break; }
  if (LOOK_WORDS.beard.test(look)) f.beard = true;
  if (LOOK_WORDS.noBeard.test(look)) f.beard = false;
  if (picks.hair) f.hair = picks.hair;
  if (picks.style) f.style = picks.style;
  if (!f.hair) f.hair = { human: 'brown', elf: 'blonde', dwarf: 'auburn', halfling: 'brown' }[hero.race] || 'brown';
  if (!f.style) f.style = { elf: 'long', dwarf: 'braids', halfling: 'short', human: 'short' }[hero.race] || 'short';
  f.hairColour = HAIR_COLOURS[f.hair] || HAIR_COLOURS.brown;
  return f;
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v + amount * 255))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// Returns an <svg> string. `size` is in CSS pixels.
function portraitSVG(hero, size = 64) {
  if (usesArt(hero)) {
    const label = `${hero.name || 'Hero'}, ${RACES[hero.race]?.name || ''} ${CLASSES[hero.cls]?.name || ''}`;
    // Zoomed in a little so the face fills the circle, even on small hero cards.
    return `<span class="portrait art" role="img" aria-label="${esc(label)}" style="--hero:${hero.color || '#444b5a'};width:${size}px;height:${size}px"><img src="${heroArt(hero)}" alt="" decoding="async"></span>`;
  }
  const f = portraitFeatures(hero);
  const colour = hero.color || '#444b5a';
  const skin = f.skin, skinDark = shade(skin, -0.12), hair = f.hairColour, hairDark = shade(hair, -0.15);
  // Face shape by race: halflings are round, dwarves are broad, elves are narrow.
  const face = { human: [50, 52, 17, 20], elf: [50, 52, 15, 21], dwarf: [50, 53, 19, 19], halfling: [50, 54, 18, 18] }[hero.race] || [50, 52, 17, 20];
  const [cx, cy, rx, ry] = face;
  const top = cy - ry, eyeY = cy - 2, parts = [];

  // Background and shoulders (outfit by class).
  parts.push(`<circle cx="50" cy="50" r="50" fill="${colour}"/>`);
  parts.push(`<circle cx="50" cy="50" r="46" fill="${shade(colour, 0.12)}"/>`);
  const outfit = {
    fighter: `<path d="M14 100 Q16 76 50 74 Q84 76 86 100Z" fill="#8e98a6"/><path d="M14 100 Q14 80 30 78 L34 100Z" fill="#b8c0cc"/><path d="M86 100 Q86 80 70 78 L66 100Z" fill="#b8c0cc"/><path d="M42 76 L50 92 L58 76Z" fill="${colour}"/>`,
    wizard: `<path d="M12 100 Q16 74 50 72 Q84 74 88 100Z" fill="${shade(colour, -0.2)}"/><path d="M40 74 L50 100 L60 74Z" fill="${shade(colour, -0.35)}"/><text x="50" y="96" font-size="9" text-anchor="middle" fill="#ffd76a">★</text>`,
    rogue: `<path d="M12 100 Q16 74 50 72 Q84 74 88 100Z" fill="#3a2f2a"/><path d="M30 76 L50 100 L70 76" fill="none" stroke="#5c4a3c" stroke-width="3"/>`,
    cleric: `<path d="M12 100 Q16 74 50 72 Q84 74 88 100Z" fill="#f2ead8"/><path d="M44 74 L50 100 L56 74Z" fill="#d4a937"/><circle cx="50" cy="88" r="4.5" fill="#d4a937"/>`,
  }[hero.cls] || '';

  // Hair behind the head.
  if (f.style === 'long') parts.push(`<path d="M${cx - rx - 4} ${cy - 4} Q${cx - rx - 8} ${cy + 26} ${cx - rx + 2} ${cy + 30} L${cx + rx - 2} ${cy + 30} Q${cx + rx + 8} ${cy + 26} ${cx + rx + 4} ${cy - 4}Z" fill="${hairDark}"/>`);
  if (f.style === 'braids') parts.push(`<rect x="${cx - rx - 5}" y="${cy - 4}" width="6" height="30" rx="3" fill="${hairDark}"/><rect x="${cx + rx - 1}" y="${cy - 4}" width="6" height="30" rx="3" fill="${hairDark}"/>`);
  if (hero.cls === 'rogue') parts.push(`<path d="M${cx - rx - 9} ${cy + 26} Q${cx - rx - 12} ${top - 12} ${cx} ${top - 13} Q${cx + rx + 12} ${top - 12} ${cx + rx + 9} ${cy + 26}Z" fill="#2c2420"/>`);

  parts.push(outfit);
  parts.push(`<rect x="${cx - 6}" y="${cy + ry - 6}" width="12" height="12" fill="${skinDark}"/>`); // neck

  // Ears: pointed for elves, round otherwise.
  if (hero.race === 'elf') {
    parts.push(`<path d="M${cx - rx + 1} ${eyeY - 2} L${cx - rx - 11} ${eyeY - 12} L${cx - rx + 2} ${eyeY + 8}Z" fill="${skinDark}"/><path d="M${cx + rx - 1} ${eyeY - 2} L${cx + rx + 11} ${eyeY - 12} L${cx + rx - 2} ${eyeY + 8}Z" fill="${skinDark}"/>`);
  } else {
    parts.push(`<ellipse cx="${cx - rx}" cy="${eyeY + 3}" rx="3.5" ry="5" fill="${skinDark}"/><ellipse cx="${cx + rx}" cy="${eyeY + 3}" rx="3.5" ry="5" fill="${skinDark}"/>`);
  }
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${skin}"/>`); // face

  // Eyes, brows, nose, mouth.
  const ex = rx * 0.42;
  const browY = eyeY - 5 + (f.mood === 'frown' ? 1 : 0);
  parts.push(`<ellipse cx="${cx - ex}" cy="${eyeY}" rx="2.2" ry="2.6" fill="#22191a"/><ellipse cx="${cx + ex}" cy="${eyeY}" rx="2.2" ry="2.6" fill="#22191a"/>`);
  parts.push(`<circle cx="${cx - ex + 0.8}" cy="${eyeY - 0.9}" r="0.7" fill="#fff"/><circle cx="${cx + ex + 0.8}" cy="${eyeY - 0.9}" r="0.7" fill="#fff"/>`);
  const tilt = f.mood === 'frown' ? 2 : 0;
  parts.push(`<path d="M${cx - ex - 3.5} ${browY - tilt} L${cx - ex + 3} ${browY + tilt}" stroke="${hairDark}" stroke-width="1.8" stroke-linecap="round"/><path d="M${cx + ex + 3.5} ${browY - tilt} L${cx + ex - 3} ${browY + tilt}" stroke="${hairDark}" stroke-width="1.8" stroke-linecap="round"/>`);
  parts.push(`<path d="M${cx} ${eyeY + 2} Q${cx + 2.5} ${eyeY + 7} ${cx - 1} ${eyeY + 8}" fill="none" stroke="${skinDark}" stroke-width="1.4" stroke-linecap="round"/>`);
  const my = eyeY + 13;
  const mouth = f.mood === 'grin'
    ? `<path d="M${cx - 6} ${my - 1} Q${cx} ${my + 6} ${cx + 6} ${my - 1}Z" fill="#7a2a2a"/>`
    : f.mood === 'frown'
      ? `<path d="M${cx - 5} ${my + 2} Q${cx} ${my - 2} ${cx + 5} ${my + 2}" fill="none" stroke="#7a2a2a" stroke-width="1.6" stroke-linecap="round"/>`
      : `<path d="M${cx - 5} ${my} Q${cx} ${my + 4} ${cx + 5} ${my}" fill="none" stroke="#7a2a2a" stroke-width="1.6" stroke-linecap="round"/>`;

  if (f.freckles) parts.push([[-7, 4], [-9, 6], [-5, 6], [7, 4], [9, 6], [5, 6]].map(([dx, dy]) => `<circle cx="${cx + dx}" cy="${eyeY + dy}" r="0.8" fill="${shade(skin, -0.3)}"/>`).join(''));
  if (hero.race === 'halfling') parts.push(`<circle cx="${cx - ex - 2}" cy="${eyeY + 7}" r="3" fill="#e88a8a" opacity=".45"/><circle cx="${cx + ex + 2}" cy="${eyeY + 7}" r="3" fill="#e88a8a" opacity=".45"/>`);

  // Beard (drawn over the jaw, with the mouth on top).
  if (f.beard) parts.push(`<path d="M${cx - rx + 1} ${cy} Q${cx - rx + 2} ${cy + ry + 14} ${cx} ${cy + ry + 16} Q${cx + rx - 2} ${cy + ry + 14} ${cx + rx - 1} ${cy} Q${cx} ${cy + 10} ${cx - rx + 1} ${cy}Z" fill="${hair}"/><path d="M${cx - 8} ${my - 3} Q${cx} ${my - 7} ${cx + 8} ${my - 3}" fill="none" stroke="${hairDark}" stroke-width="3" stroke-linecap="round"/>`);
  parts.push(mouth);

  // Hair on top.
  if (f.style !== 'bald' && hero.cls !== 'rogue') {
    parts.push(`<path d="M${cx - rx - 1} ${cy - 2} Q${cx - rx - 2} ${top - 6} ${cx} ${top - 5} Q${cx + rx + 2} ${top - 6} ${cx + rx + 1} ${cy - 2} Q${cx + rx - 3} ${top + 5} ${cx + 4} ${top + 4} Q${cx - 4} ${top + 9} ${cx - rx + 3} ${top + 8} Q${cx - rx} ${cy - 6} ${cx - rx - 1} ${cy - 2}Z" fill="${hair}"/>`);
    if (f.style === 'topknot') parts.push(`<circle cx="${cx}" cy="${top - 7}" r="5.5" fill="${hair}"/>`);
  } else if (f.style !== 'bald' && hero.cls === 'rogue') {
    parts.push(`<path d="M${cx - rx + 2} ${top + 9} Q${cx} ${top - 2} ${cx + rx - 2} ${top + 9} Q${cx} ${top + 5} ${cx - rx + 2} ${top + 9}Z" fill="${hair}"/>`);
  }

  // Extras from the description.
  if (f.scar) parts.push(`<path d="M${cx + ex + 4} ${eyeY - 7} L${cx + ex - 1} ${eyeY + 7}" stroke="#b0524f" stroke-width="1.4" stroke-linecap="round"/>`);
  if (f.glasses) parts.push(`<g fill="none" stroke="#3a2a1a" stroke-width="1.2"><circle cx="${cx - ex}" cy="${eyeY}" r="4.2"/><circle cx="${cx + ex}" cy="${eyeY}" r="4.2"/><path d="M${cx - ex + 4.2} ${eyeY} L${cx + ex - 4.2} ${eyeY}"/></g>`);
  if (f.eyepatch) parts.push(`<path d="M${cx - rx + 1} ${eyeY - 9} L${cx + rx - 2} ${eyeY + 6}" stroke="#1a1414" stroke-width="1.2"/><ellipse cx="${cx - ex}" cy="${eyeY}" rx="4.4" ry="4" fill="#1a1414"/>`);

  // Class headwear.
  if (hero.cls === 'wizard') parts.push(`<path d="M${cx - rx - 8} ${top + 4} L${cx + rx + 8} ${top + 4} Q${cx + 4} ${top + 0} ${cx + 6} ${top - 2} L${cx + 12} ${top - 26} L${cx - 6} ${top - 2} Q${cx - 4} ${top} ${cx - rx - 8} ${top + 4}Z" fill="${shade(colour, -0.25)}"/><text x="${cx + 3}" y="${top - 6}" font-size="7" text-anchor="middle" fill="#ffd76a">✦</text>`);
  if (hero.cls === 'fighter') parts.push(`<path d="M${cx - rx} ${top + 7} Q${cx} ${top + 1} ${cx + rx} ${top + 7}" fill="none" stroke="${colour}" stroke-width="3"/>`);
  if (hero.cls === 'cleric') parts.push(`<ellipse cx="${cx}" cy="${top - 4}" rx="${rx - 2}" ry="3.5" fill="none" stroke="#ffd76a" stroke-width="2" opacity=".9"/>`);
  if (hero.cls === 'rogue') parts.push(`<path d="M${cx - rx + 1} ${eyeY - 4} L${cx + rx - 1} ${eyeY - 4} L${cx + rx - 2} ${eyeY + 3} L${cx - rx + 2} ${eyeY + 3}Z" fill="#1a1414" opacity=".55"/>`);

  const label = `${hero.name || 'Hero'}, ${RACES[hero.race]?.name || ''} ${CLASSES[hero.cls]?.name || ''}`;
  return `<svg class="portrait" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${esc(label)}"><defs><clipPath id="pc"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#pc)">${parts.join('')}</g></svg>`;
}
