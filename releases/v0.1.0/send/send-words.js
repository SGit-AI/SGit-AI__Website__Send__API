/* send-words.js, api.send.sgit.ai v0.1.0
 *
 * The 320 words a friendly token is made of: two words and four digits, "river-cloud-3847". The list is the one
 * send.sgraph.ai has used since its v0.2.6 (V026_WORDS), copied so that a token made here opens there and a token
 * made there opens here. Do not edit it: a word added or removed changes nothing cryptographic (the token is the
 * passphrase, whatever words it is made of) but it changes which tokens this release can generate, and the count
 * below is quoted on the site. 320 x 320 x 10,000 = 1,024,000,000 tokens.
 */
export const WORDS = Object.freeze([
    'acorn', 'agate', 'alder', 'amber', 'anchor', 'anvil', 'apple', 'arrow', 'aspen', 'atlas',
    'badge', 'baker', 'barn', 'basin', 'beach', 'berry', 'birch', 'blade', 'blank', 'blaze',
    'bloom', 'board', 'bold', 'bonus', 'brave', 'bread', 'brick', 'brook', 'brush', 'cabin',
    'camel', 'candy', 'cargo', 'cedar', 'chain', 'chalk', 'charm', 'chess', 'chief', 'chill',
    'cider', 'citrus', 'civic', 'claim', 'clay', 'cliff', 'climb', 'clock', 'cloud', 'clover',
    'coach', 'coast', 'cobalt', 'cocoa', 'coral', 'craft', 'crane', 'crash', 'creek', 'crest',
    'crisp', 'cross', 'crown', 'cubic', 'curve', 'dance', 'dawn', 'delta', 'depot', 'diary',
    'dodge', 'dove', 'draft', 'dream', 'drift', 'drum', 'dune', 'eagle', 'earth', 'echo',
    'elder', 'elite', 'ember', 'epoch', 'equal', 'fable', 'faith', 'falcon', 'feast', 'fern',
    'ferry', 'fiber', 'field', 'flame', 'flash', 'flint', 'float', 'flora', 'flute', 'focus',
    'forge', 'found', 'frost', 'fruit', 'fudge', 'gaze', 'giant', 'glade', 'glass', 'gleam',
    'globe', 'glow', 'gold', 'grace', 'grain', 'grand', 'grape', 'green', 'grove', 'guard',
    'guide', 'guild', 'halo', 'harbor', 'haven', 'hawk', 'hazel', 'heart', 'hedge', 'herb',
    'heron', 'honey', 'horizon', 'hound', 'humor', 'index', 'iris', 'ivory', 'jasper', 'jewel',
    'jolly', 'judge', 'jungle', 'karma', 'kite', 'knoll', 'lake', 'latch', 'lemon', 'level',
    'light', 'lily', 'linen', 'lion', 'lodge', 'logic', 'lotus', 'lucky', 'lunar', 'lyre',
    'magic', 'mango', 'manor', 'maple', 'marsh', 'match', 'mayor', 'medal', 'melon', 'mercy',
    'mirth', 'model', 'moose', 'mortar', 'moss', 'mount', 'music', 'myth', 'nectar', 'noble',
    'north', 'novel', 'nutmeg', 'oak', 'oasis', 'ocean', 'olive', 'onset', 'onyx', 'opal',
    'orange', 'orbit', 'otter', 'oxide', 'palm', 'panel', 'patch', 'peace', 'pearl', 'pecan',
    'pepper', 'petal', 'pilot', 'pixel', 'plant', 'plaza', 'plume', 'plush', 'polar', 'pouch',
    'prism', 'proud', 'pulse', 'quail', 'queen', 'quest', 'quick', 'radar', 'rain', 'rapid',
    'raven', 'reach', 'realm', 'reed', 'reef', 'relay', 'ribbon', 'ridge', 'river', 'robin',
    'robot', 'royal', 'ruby', 'rumor', 'sage', 'sandy', 'satin', 'scale', 'scene', 'scout',
    'scroll', 'shade', 'shark', 'shell', 'shift', 'shine', 'silk', 'slate', 'smile', 'solar',
    'solid', 'sonic', 'spark', 'spell', 'spice', 'spine', 'spoke', 'spruce', 'staff', 'stamp',
    'star', 'steam', 'steel', 'stone', 'storm', 'sugar', 'sunny', 'surge', 'sweep', 'swift',
    'table', 'tango', 'terra', 'thistle', 'thorn', 'tiger', 'toast', 'token', 'topaz', 'tower',
    'trace', 'trail', 'trend', 'trout', 'tulip', 'twist', 'ultra', 'umber', 'union', 'unity',
    'urban', 'valid', 'valve', 'vault', 'velvet', 'verse', 'vigor', 'vine', 'vinyl', 'vivid',
    'voice', 'walnut', 'water', 'wave', 'wheat', 'whole', 'wick', 'willow', 'wind', 'wolf',
    'wonder', 'world', 'wren', 'yacht', 'yarn', 'yarrow', 'yield', 'zenith', 'zinc', 'zone',
])
export const WORD_COUNT = WORDS.length
export const COMBINATIONS = WORDS.length * WORDS.length * 10000
