// Server-only word banks, grouped by category. Never sent to clients.
const CATEGORIES = {
  Animals: [
    "DOG", "CAT", "TIGER", "ELEPHANT", "LION", "HORSE", "MONKEY", "RABBIT",
    "SNAKE", "SPIDER", "BUTTERFLY", "PENGUIN", "OCTOPUS", "WHALE", "SHARK",
    "DINOSAUR", "FROG", "OWL", "BEAR", "DEER", "FOX", "WOLF", "ZEBRA",
    "GIRAFFE", "KANGAROO", "PANDA", "KOALA", "PIG", "COW", "SHEEP", "GOAT",
    "DUCK", "CHICKEN", "TURTLE", "CROCODILE", "HIPPO", "SQUIRREL", "MOUSE",
    "CAMEL", "PARROT", "HEDGEHOG", "SEAGULL", "LOBSTER", "CRAB", "PONY",
  ],
  Food: [
    "PIZZA", "BURGER", "APPLE", "CAKE", "SANDWICH", "ICE_CREAM", "CHOCOLATE",
    "COFFEE", "TEA", "EGG", "BREAD", "CHEESE", "SOUP", "SALAD", "SPAGHETTI",
    "SUSHI", "TACO", "DONUT", "POPCORN", "BANANA", "GRAPES", "STRAWBERRY",
    "CUPCAKE", "COOKIE", "PANCAKE", "WAFFLE", "PIE", "HOT_DOG", "FRIES",
    "MANGO", "WATERMELON", "ORANGE", "LEMON", "CARROT", "BROCCOLI", "CORN",
    "RICE", "NOODLES", "BURRITO", "SMOOTHIE", "MILKSHAKE", "CANDY",
    "AVOCADO", "PINEAPPLE", "CUCUMBER", "TOMATO", "ONION",
  ],
  Objects: [
    "PHONE", "CHAIR", "TABLE", "LAPTOP", "CLOCK", "BOOK", "PENCIL", "PAPER",
    "SCISSORS", "KEY", "UMBRELLA", "HAT", "SHOE", "SHIRT", "PANTS", "GLASSES",
    "CROWN", "RING", "BALLOON", "KITE", "LAMP", "CANDLE", "MIRROR", "PILLOW",
    "BLANKET", "DOOR", "WINDOW", "STOVE", "FRIDGE", "TOASTER", "BRUSH", "COMB",
    "WALLET", "BACKPACK", "SUITCASE", "HAMMER", "ROPE", "BASKET", "BOX",
    "BOTTLE", "CUP", "PLATE", "SPOON", "FORK", "CUSHION", "VASE",
    "LADDER", "RULER", "TAPE",
  ],
  Places: [
    "BEACH", "MOUNTAIN", "DESERT", "ISLAND", "VOLCANO", "BRIDGE", "CASTLE",
    "TENT", "SCHOOL", "HOSPITAL", "AIRPORT", "STATION", "MUSEUM", "LIBRARY",
    "PARK", "ZOO", "FARM", "FACTORY", "OFFICE", "SHOP", "MALL", "MARKET",
    "TEMPLE", "CHURCH", "HOUSE", "APARTMENT", "HOTEL", "RESTAURANT", "CAFE",
    "CINEMA", "STADIUM", "GYM", "POOL", "FOREST", "CAVE", "CITY", "VILLAGE",
    "HARBOR", "PIER", "BAKERY", "GARAGE", "LIGHTHOUSE", "CABIN", "RANCH",
    "AMUSEMENT_PARK",
  ],
  Sports: [
    "SOCCER", "BASKETBALL", "TENNIS", "CRICKET", "HOCKEY", "GOLF", "BOXING",
    "WRESTLING", "SWIMMING", "RUNNING", "CYCLING", "SKATING", "SKIING",
    "SURFING", "VOLLEYBALL", "BADMINTON", "TABLE_TENNIS", "BASEBALL",
    "FOOTBALL", "RUGBY", "KARATE", "JUDO", "FENCING", "ARCHERY", "SHOOTING",
    "WEIGHTLIFTING", "GYMNASTICS", "DANCING", "YOGA", "CHESS", "DARTS",
    "BOWLING",    "SKATEBOARDING", "SAILING", "ROWING", "CLIMBING", "HIKING",
    "FISHING", "CURLING", "SNOWBOARDING", "TRAMPOLINE", "MARATHON",
    "TRIATHLON", "POLO", "HANDBALL",
  ],
  Movies: [
    "PIRATE", "ALIEN", "ROBOT", "DRAGON", "VAMPIRE", "GHOST", "WITCH",
    "WIZARD", "NINJA", "COWBOY", "SUPERHERO", "SPACESHIP", "TIME_MACHINE",
    "TREASURE", "MONSTER", "ZOMBIE", "MUMMY", "PRINCESS", "KNIGHT", "SAMURAI",
    "DETECTIVE", "SPY", "CLOWN", "JOKER", "ANDROID", "MUTANT", "CYBORG",
    "GENIE", "MERMAID", "UNICORN", "PHOENIX", "CENTAUR", "TROLL", "ORC",
    "ELF", "DWARF", "GIANT", "FAIRY", "OGRE", "GOBLIN", "BANDIT",
    "SHERIFF", "KING", "QUEEN", "COWBOY_HAT",
  ],
  Professions: [
    "DOCTOR", "NURSE", "TEACHER", "CHEF", "PILOT", "POLICE", "FIREFIGHTER",
    "FARMER", "ARTIST", "SINGER", "DANCER", "ACTOR", "WRITER", "SCIENTIST",
    "ENGINEER", "PLUMBER", "ELECTRICIAN", "CARPENTER", "MECHANIC", "TAILOR",
    "BARBER", "BAKER", "BUTCHER", "FISHERMAN", "ASTRONAUT", "SOLDIER",
    "SAILOR", "JUDGE", "LAWYER", "BANKER", "WAITER", "GARDENER", "PAINTER",
    "PHOTOGRAPHER", "VETERINARIAN", "DENTIST", "SURGEON", "MAGICIAN",
    "LIFEGUARD", "REPORTER", "ARCHITECT", "ASTRONOMER", "BIOLOGIST",
    "LIBRARIAN", "ACCOUNTANT", "HAIRDRESSER",
  ],
  Actions: [
    "RUNNING", "JUMPING", "SWIMMING", "DANCING", "SINGING", "CLAPPING",
    "WAVING", "LAUGHING", "CRYING", "SLEEPING", "EATING", "DRINKING",
    "COOKING", "CLEANING", "WRITING", "READING", "DRAWING", "PAINTING",
    "KICKING", "THROWING", "CATCHING", "CLIMBING", "SLIDING", "SKIPPING",
    "HOPPING", "FLYING", "DIGGING", "PLANTING", "CUTTING", "PUSHING",
    "PULLING", "LIFTING", "CARRYING", "HUGGING", "KISSING", "SMILING",
    "FROWNING", "BLINKING", "SNEEZING", "COUGHING", "FOLDING", "SQUEEZING",
    "STOMPING", "CRAWLING", "WHISPERING",
  ],
  Nature: [
    "SUN", "MOON", "STAR", "CLOUD", "RAINBOW", "LIGHTNING", "SNOWMAN", "ICE",
    "FIRE", "RAIN", "SNOW", "WIND", "STORM", "TORNADO", "HURRICANE", "RIVER",
    "LAKE", "OCEAN", "SEA", "WATERFALL", "MOUNTAIN", "HILL", "VALLEY",
    "FOREST", "JUNGLE", "DESERT", "VOLCANO", "CAVE", "ISLAND", "BEACH",
    "FLOWER", "TREE", "LEAF", "GRASS", "ROCK", "STONE", "SOIL", "SAND",
    "SKY", "EARTH", "SUNSET", "SUNRISE", "PLANET", "COMET", "GALAXY",
  ],
  Technology: [
    "COMPUTER", "LAPTOP", "PHONE", "TABLET", "ROBOT", "DRONE", "CAMERA",
    "TELEVISION", "RADIO", "SPEAKER", "HEADPHONES", "KEYBOARD", "MOUSE",
    "MONITOR", "PRINTER", "SCANNER", "PROJECTOR", "CHARGER", "BATTERY",
    "LIGHTBULB", "WIFI", "INTERNET", "EMAIL", "CONSOLE", "VIDEO_GAME",
    "APP", "VIRUS", "HACKER", "CODE", "DATABASE", "SERVER", "MICROCHIP",
    "SATELLITE", "ROCKET", "TELEPHONE", "CALCULATOR", "WATCH", "SMARTWATCH",
    "EARBUDS", "MICROPHONE", "GADGET", "WIDGET", "BROWSER", "WEBSITE",
    "SOFTWARE",
  ],
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick up to `count` distinct unused words from a category.
 * - Only words NOT in `usedWords` are eligible.
 * - If fewer than `count` remain, returns all remaining (never reuses used words).
 * - Returns [] when the category pool is exhausted.
 */
function pickWords(category, usedWords, count) {
  const pool = CATEGORIES[category] || [];
  const unused = pool.filter((w) => !usedWords.has(w));
  return shuffle(unused).slice(0, count);
}

module.exports = { CATEGORIES, pickWords };
