// Word-triplet seed codes for shareable board generation
// 1,296 common 4-letter words = 1,296^3 ≈ 2.18 billion unique codes

const WORD_LIST = [
  "ABLE","ACHE","ACID","ACNE","ACRE","AGED","AIDS","AIMS","AIRY","AKIN","ALAS","ALLY","ALOE","ALSO","AMID","AMMO","ANEW","ANTE","ANTI","ANTS","APES","APEX","AQUA","ARCH","AREA","ARMS","ARMY","ARTS","ASKS","ATOM","AUNT","AURA","AUTO","AWOL","AWRY","BACK","BAGS","BAIL","BAIT","BAKE","BALD","BALE","BALL","BALM","BAND","BANE","BANG","BANK","BARE","BARK","BARN","BASE","BASH","BASS","BATH","BATS","BAYS","BEAD","BEAK","BEAM","BEAN","BEAR","BEAT","BECK","BEDS","BEEF","BEEN","BEEP","BEER","BEES","BEET","BEGS","BELL","BELT","BEND","BENT","BEST","BETA","BETS","BIAS","BIKE","BILL","BIND","BINS","BIRD","BITE","BITS","BLED","BLEW","BLOB","BLOT","BLOW","BLUE","BLUR","BOAT","BODY","BOIL","BOLD","BOLT","BOMB","BOND","BONE","BOOK","BOOM","BOON","BOOT","BORE","BORN","BOSS","BOTH","BOUT","BOWL","BOWS","BOYS","BRAG","BRAT","BRAY","BRED","BREW","BRIM","BROW","BUCK","BUDS","BUFF","BUGS","BULB","BULK","BULL","BUMP","BUMS","BUNK","BUNS","BURN","BURY","BUSH","BUST","BUSY","BUZZ","BYTE","CAFE","CAGE","CAKE","CALF","CALL","CALM","CAME","CAMP","CANE","CAPE","CAPS","CARD","CARE","CARP","CART","CASE","CASH","CASK","CAST","CATS","CAVE","CELL","CENT","CHAR","CHAT","CHEF","CHEW","CHIC","CHIN","CHIP","CHOP","CHOW","CHUB","CHUG","CHUM","CITE","CITY","CLAD","CLAM","CLAN","CLAP","CLAW","CLAY","CLEF","CLIP","CLOD","CLOG","CLOT","CLUB","CLUE","COAL","COAT","COAX","CODE","COIL","COIN","COKE","COLA","COLD","COLT","COMA","COMB","COME","COMP","CONE","COOK","COOL","COPE","COPS","COPY","CORD","CORE","CORK","CORN","COST","COUP","COVE","COWS","COZY","CRAB","CRAM","CREW","CRIB","CROP","CROW","CUBE","CULT","CUPS","CURB","CURE","CURL","CUSS","CUTE","CUTS","DADS","DAME","DAMP","DARE","DARK","DARN","DART","DASH","DATA","DATE","DAWN","DAYS","DAZE","DEAD","DEAF","DEAL","DEAN","DEAR","DEBT","DECK","DECO","DEED","DEEP","DEER","DEFY","DELI","DEMO","DENT","DENY","DESK","DIAL","DICE","DIED","DIES","DIET","DIGS","DILL","DIME","DINE","DING","DIRE","DIRT","DISH","DISK","DIVA","DIVE","DOCK","DOCS","DOES","DOGS","DOLE","DOLL","DOME","DONE","DOOM","DOOR","DOSE","DOTS","DOVE","DOWN","DRAG","DRAM","DRAW","DREW","DRIP","DROP","DRUG","DRUM","DUAL","DUCK","DUCT","DUDE","DUES","DUET","DUKE","DULL","DUMP","DUNE","DUNK","DUSK","DUST","DUTY","DYED","DYES","EACH","EARL","EARN","EARS","EASE","EAST","EASY","EATS","ECHO","EDGE","EDGY","EDIT","EELS","EGGS","ELSE","ENDS","ENVY","EPIC","ETCH","EURO","EVEN","EVER","EVIL","EXAM","EXIT","EYED","EYES","FACE","FACT","FADE","FAIL","FAIR","FAKE","FALL","FAME","FANG","FANS","FARE","FARM","FAST","FATE","FATS","FAVE","FEAR","FEAT","FEDS","FEED","FEEL","FEES","FEET","FELL","FELT","FERN","FETA","FIGS","FILE","FILL","FILM","FIND","FINE","FIRE","FIRM","FISH","FIST","FITS","FIVE","FIZZ","FLAG","FLAN","FLAP","FLAT","FLAX","FLEA","FLED","FLEE","FLEW","FLEX","FLIP","FLOG","FLOP","FLOW","FLUX","FOAM","FOES","FOLD","FOLK","FOND","FONT","FOOD","FOOL","FOOT","FORE","FORK","FORM","FORT","FOUL","FOUR","FOXY","FRAY","FREE","FROG","FROM","FUEL","FULL","FUND","FURY","FUSE","FUSS","FUZZ","GAIN","GAIT","GALA","GALE","GALL","GALS","GAME","GANG","GAPE","GAPS","GATE","GAVE","GAZE","GEAR","GEEK","GEMS","GENE","GERM","GETS","GIFT","GIRL","GIST","GIVE","GLAD","GLEE","GLEN","GLIB","GLOW","GLUE","GNAW","GOAL","GOAT","GODS","GOES","GOLD","GOLF","GONE","GONG","GOOD","GORE","GOUT","GOWN","GRAB","GRAD","GRAM","GRAY","GREW","GREY","GRID","GRIM","GRIN","GRIP","GRIT","GROW","GULF","GULL","GUNS","GUTS","GUYS","GYMS","HACK","HAIL","HAIR","HALF","HALL","HALO","HAND","HANG","HARE","HARM","HASH","HATE","HATS","HAVE","HAWK","HAYS","HAZE","HAZY","HEAD","HEAL","HEAP","HEAR","HEAT","HEED","HEEL","HEIR","HELD","HELM","HELP","HEMP","HENS","HERB","HERD","HERE","HERO","HERS","HIGH","HIKE","HILL","HIND","HINT","HIPS","HIRE","HISS","HITS","HIVE","HOAX","HOLD","HOLE","HOLY","HOME","HONE","HOOD","HOOF","HOOK","HOPE","HOPS","HORN","HOST","HOUR","HOWL","HUFF","HUGE","HUGS","HULL","HUMS","HUNG","HUNT","HURT","HUSH","HUSK","HUTS","HYPE","ICED","ICES","ICON","IDEA","IDLE","IDLY","IDOL","INCH","INFO","INNS","INTO","IRIS","IRON","ISLE","ITCH","ITEM","JACK","JADE","JAIL","JAMS","JARS","JAVA","JAWS","JAYS","JAZZ","JEAN","JEEP","JEST","JETS","JOBS","JOIN","JOKE","JOLT","JOYS","JUGS","JUKE","JUMP","JUNK","JURY","JUST","KALE","KEEN","KELP","KEPT","KEYS","KICK","KIDS","KILL","KIND","KING","KISS","KITE","KITS","KIWI","KNEE","KNEW","KNIT","KNOB","KNOT","KNOW","LABS","LACE","LACK","LACY","LADS","LADY","LAID","LAIR","LAKE","LAMB","LAME","LAMP","LAND","LANE","LARD","LARK","LASH","LASS","LAST","LATE","LAVA","LAWN","LAWS","LAYS","LAZE","LAZY","LEAD","LEAF","LEAK","LEAN","LEAP","LEFT","LEGS","LEND","LENS","LESS","LEST","LETS","LIAR","LICK","LIDS","LIED","LIES","LIFE","LIFT","LIKE","LILT","LILY","LIMB","LIME","LIMP","LINE","LINK","LION","LIPS","LIST","LIVE","LOAD","LOAF","LOAN","LOBE","LOCK","LOFT","LOGO","LONE","LONG","LOOK","LOOM","LOOP","LORD","LORE","LOSE","LOSS","LOST","LOTS","LOUD","LOVE","LUCK","LUMP","LURE","LUSH","MADE","MAID","MAIL","MAIN","MAKE","MALE","MALL","MANY","MAPS","MARE","MARK","MARS","MASH","MASK","MASS","MAST","MATE","MATH","MAZE","MEAL","MEAN","MEAT","MEET","MELT","MEMO","MEND","MENU","MERE","MESH","MESS","MILD","MILE","MILK","MILL","MIND","MINE","MINI","MINK","MINT","MISS","MIST","MITE","MOAT","MOCK","MODE","MOLD","MOLE","MONK","MOOD","MOON","MOOR","MORE","MORN","MOSS","MOST","MOTH","MOVE","MUCH","MUGS","MULE","MUMS","MURK","MUSE","MUST","MUTE","MUTT","NAIL","NAME","NAVY","NEAR","NEAT","NECK","NEED","NEST","NETS","NEWS","NEWT","NEXT","NICE","NICK","NINE","NODE","NOEL","NONE","NOOK","NOON","NOPE","NORM","NOSE","NOSY","NOTE","NOUN","NOVA","NULL","NUMB","NUNS","NUTS","OAKS","OATS","OBEY","ODDS","OGLE","OINK","OKAY","OMEN","OMIT","ONCE","ONES","ONLY","ONTO","OOPS","OOZE","OPAL","OPEN","OURS","OVAL","OVEN","OVER","OWLS","OWNS","PACE","PACK","PACT","PADS","PAGE","PAID","PAIL","PAIN","PAIR","PALE","PALM","PANE","PANS","PARK","PART","PASS","PAST","PATH","PAVE","PAWN","PAWS","PAYS","PEAK","PEAR","PEAS","PEAT","PEEL","PEER","PENS","PERK","PEST","PETS","PEWS","PICK","PIER","PIES","PIKE","PILE","PILL","PINE","PING","PINK","PINS","PINT","PIPE","PITS","PITY","PLAN","PLAY","PLEA","PLED","PLOT","PLOW","PLOY","PLUG","PLUM","PLUS","POEM","POET","POKE","POLE","POLO","POMP","POND","PONY","POOL","POOR","POPE","POPS","PORK","PORT","POSE","POST","POTS","POUT","PRAY","PREP","PREY","PROD","PROF","PROM","PROP","PUBS","PULL","PUMP","PUNK","PURE","PUSH","PUTS","QUAD","QUAY","QUIZ","RACE","RACK","RAFT","RAGE","RAGS","RAID","RAIL","RAIN","RAKE","RANG","RANK","RARE","RASH","RATE","RAVE","RAYS","READ","REAL","REAR","REDS","REED","REEF","REEL","REIN","RENT","REST","RICE","RICH","RIDE","RILE","RIND","RING","RINK","RIOT","RIPE","RISE","RISK","RITE","ROAD","ROAM","ROAR","ROBE","ROCK","RODE","ROLE","ROLL","ROOF","ROOM","ROOT","ROPE","ROSE","RUBY","RUGS","RUIN","RULE","RUNE","RUNS","RUSH","RUST","SACK","SAFE","SAGA","SAGE","SAID","SAIL","SAKE","SALE","SALT","SAME","SAND","SANE","SANG","SANK","SAVE","SAYS","SCAM","SCAN","SCAR","SEAL","SEAS","SEAT","SECT","SEED","SEEK","SEEM","SEEN","SEER","SELF","SELL","SEMI","SEND","SENT","SERF","SETS","SEWN","SHED","SHIN","SHIP","SHOE","SHOP","SHOT","SHOW","SHUN","SHUT","SICK","SIDE","SIGH","SIGN","SILK","SILT","SING","SINK","SITE","SITS","SIZE","SKIT","SLAB","SLAM","SLAP","SLAY","SLED","SLEW","SLID","SLIM","SLIT","SLOT","SLOW","SLUG","SLUR","SMOG","SNAP","SNOB","SNOW","SNUG","SOAK","SOAP","SOAR","SOBS","SOCK","SODA","SOFA","SOFT","SOIL","SOLD","SOLE","SOLO","SOME","SONG","SONS","SOON","SOOT","SORE","SORT","SOUL","SOUP","SOUR","SOWN","SPAN","SPAR","SPEC","SPIN","SPOT","SPRY","SPUN","SPUR","STAB","STAR","STAY","STEM","STEP","STEW","STIR","STOP","STOW","STUB","STUD","STUN","SUCH","SUIT","SUMS","SUNG","SUNS","SURE","SURF","SWAM","SWAN","SWAP","SWAY","SWIM","TACK","TACO","TAGS","TAIL","TAKE","TALE","TALK","TALL","TAME","TANK","TAPE","TAPS","TART","TASK","TAXI","TEAL","TEAM","TEAR","TEAS","TEEN","TELL","TEMP","TEND","TENS","TENT","TERM","TEST","TEXT","THAT","THAW","THEM","THEN","THEY","THIN","THIS","THUD","THUG","THUS","TICK","TIDE","TIDY","TIED","TIER","TIES","TILE","TILL","TILT","TIME","TINT","TINY","TIPS","TIRE","TOFU","TOLD","TOLL","TOMB","TONE","TONS","TONY","TOOK","TOOL","TOPS","TORE","TORN","TOSS","TOUR","TOUT","TOWN","TOYS","TRAP","TRAY","TREE","TREK","TRIM","TRIO","TRIP","TRUE","TUBS","TUCK","TUNA","TUNE","TURN","TWIN","TYPE","UGLY","UNDO","UNIT","UNTO","UPON","URGE","USED","USER","VAIN","VARY","VASE","VAST","VEER","VEIL","VEIN","VERB","VERY","VEST","VIBE","VICE","VIEW","VILE","VINE","VISA","VOID","VOLT","VOTE","VOWS","WADE","WAGE","WAIL","WAIT","WAKE","WALK","WALL","WAND","WANT","WARD","WARE","WARM","WARN","WARS","WASH","WASP","WATT","WAVE","WAVY","WAYS","WEAK","WEAR","WEED","WEEK","WELL","WENT","WERE","WEST","WHAT","WHEN","WHIP","WICK","WIDE","WIFE","WILD","WILL","WIND","WINE","WING","WINK","WINS","WIPE","WIRE","WISE","WISH","WITH","WOLF","WOMB","WOOD","WOOL","WORD","WORE","WORK","WORM","WORN","WOVE","WRAP","WREN","YAKS","YAMS","YANK","YARD","YARN","YAWN","YEAH","YEAR","YELL","YETI","YOGA","YOGI","YOKE","YOLK","YOUR","YULE","ZANY","ZEAL","ZERO","ZEST","ZING","ZONE","ZOOM","ZOOS",
];

const WORD_COUNT = WORD_LIST.length; // 1296

// Build reverse lookup once
const WORD_INDEX = new Map<string, number>();
for (let i = 0; i < WORD_LIST.length; i++) {
  WORD_INDEX.set(WORD_LIST[i], i);
}

// Board sizes: 0 = 4x4, 1 = 5x5, 2 = 6x6
const BOARD_SIZES = [4, 5, 6];

const MAX_SEED = Math.floor(WORD_COUNT * WORD_COUNT * WORD_COUNT / 3); // ~725 million seeds per board size

/**
 * Encode a board size + seed into a word triplet code.
 * value = sizeIndex + 3 * (seed % MAX_SEED)
 * This gives ~725 million unique seeds per board size.
 */
export function encodeSeedCode(boardSize: number, seed: number): string {
  const sizeIndex = BOARD_SIZES.indexOf(boardSize);
  if (sizeIndex === -1) throw new Error(`Invalid board size: ${boardSize}`);

  const boundedSeed = (seed >>> 0) % MAX_SEED;
  const value = sizeIndex + 3 * boundedSeed;

  const w3 = value % WORD_COUNT;
  const w2 = Math.floor(value / WORD_COUNT) % WORD_COUNT;
  const w1 = Math.floor(value / (WORD_COUNT * WORD_COUNT)) % WORD_COUNT;

  return `${WORD_LIST[w1]}-${WORD_LIST[w2]}-${WORD_LIST[w3]}`;
}

/**
 * Decode a word triplet code back to board size + seed.
 * Returns null if the code is invalid.
 */
export function decodeSeedCode(code: string): { boardSize: number; seed: number } | null {
  const parts = code.toUpperCase().split('-');
  if (parts.length !== 3) return null;

  const i1 = WORD_INDEX.get(parts[0]);
  const i2 = WORD_INDEX.get(parts[1]);
  const i3 = WORD_INDEX.get(parts[2]);

  if (i1 === undefined || i2 === undefined || i3 === undefined) return null;

  const value = i1 * WORD_COUNT * WORD_COUNT + i2 * WORD_COUNT + i3;
  const sizeIndex = value % 3;
  const seed = Math.floor(value / 3);

  return {
    boardSize: BOARD_SIZES[sizeIndex],
    seed,
  };
}

/**
 * Generate a deterministic seed from a daily date string.
 * Uses FNV-1a hash of the date string.
 */
export function getDailySeed(dateStr: string): number {
  return fnv1a(`froggle-daily-${dateStr}`);
}

/**
 * Daily Relaxed mode uses a distinct namespace so its board for a given day
 * differs from the timed daily.
 */
export function getDailyRelaxedSeed(dateStr: string): number {
  return fnv1a(`froggle-daily-relaxed-${dateStr}`);
}

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Generate a random seed within the encodable range.
 */
export function randomSeed(): number {
  return Math.floor(Math.random() * MAX_SEED);
}

/**
 * Mulberry32 - deterministic 32-bit PRNG.
 * Returns a function that produces the next random float in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
