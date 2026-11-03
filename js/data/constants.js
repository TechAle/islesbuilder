import './types.js';

export const API_URL = "https://isleswiki.net/api/v1";

export const API_ITEM_ENDPOINTS = [
    "/items?category=weapons",
    "/items?category=armor",
    "/items?category=accessories"
];

export const API_ELIXIRS_ENDPOINT = "/elixirs";
export const API_REQUEST_TIMEOUT_MS = 10000;
export const API_MAX_ATTEMPTS = 2;

/** @type {import('./types.js').ClassKey[]} */
export const CLASS_KEYS = ['warrior', 'archer', 'mage'];

/** @type {import('./types.js').ClassKey} */
export const DEFAULT_CLASS = 'archer';

/** @type {import('./types.js').EquipSlot[]} */
export const EQUIP_SLOTS = [
    'weapon',
    'glove',
    'helmet',
    'amulet',
    'chestplate',
    'ring1',
    'ring2',
    'leggings',
    'boots',
    'feet',
    'core',
    'pets'
];

/** @type {import('./types.js').EquipSlot[]} */
export const RING_SLOTS = ['ring1', 'ring2'];

export const RING_ITEM_CATEGORY = 'ring';
export const AUGMENT_SLOTS_PER_ITEM = 3;
export const MAX_ELIXIR_LEVEL = 5;
export const DEFAULT_ELIXIR_LEVEL = 0;
export const DEFAULT_SHARED_POINTS = 100;

/**
 * Elemental Power di base di ogni personaggio.
 * L'EP totale è `(base + flat) * (1 + percent / 100)` e scala i danni
 * elementali con rapporto `EP / 100`.
 */
export const BASE_ELEMENTAL_POWER = 100;

/** Crit Damage di base: un colpo critico fa sempre +50% danno. */
export const BASE_CRIT_DAMAGE = 50;

/** Tempo base di un attacco, in secondi. */
export const BASE_ATTACK_TIME = 0.6;

/** Energy Regen di base al secondo. */
export const BASE_ENERGY_REGEN = 10;

/** Max Energy di base del personaggio. */
export const BASE_MAX_ENERGY = 100;

/** Cooldown tra una pozione e l'altra, in secondi. */
export const POTION_COOLDOWN = 1.5;

/** Energia ripristinata da una pozione. */
export const POTION_ENERGY = 25;

/** Burst: percentuale del danno (damage modifiers) inflitta ogni secondo. */
export const BURST_DAMAGE_PERCENT = 75;

/** Burst: durata dell'effetto attivo, in secondi. */
export const BURST_ACTIVE_SECONDS = 10;

/** Burst: ciclo completo attivo + cooldown, in secondi. */
export const BURST_INTERVAL = 30;

/** Burst: energia consumata da un burst. */
export const BURST_ENERGY_COST = 50;

/**
 * Mappa lo slot grezzo restituito dall'API alla categoria usata da ITEM_DATABASE.
 * @type {Record<string, string>}
 */
export const SLOT_TO_ITEM_CATEGORY = {
    "amulet": "amulet",
    "axe": "weapon",
    "boots": "boots",
    "bow": "weapon",
    "chestplate": "chestplate",
    "crossbow": "weapon",
    "crux": "weapon",
    "dagger": "weapon",
    "focus": "weapon",
    "gauntlet": "weapon",
    "gloves": "glove",
    "greatbow": "weapon",
    "hammer": "weapon",
    "handcannon": "weapon",
    "helmet": "helmet",
    "kunai": "weapon",
    "leggings": "leggings",
    "mace": "weapon",
    "pot": "weapon",
    "ring": "ring",
    "spear": "weapon",
    "staff": "weapon",
    "sword": "weapon",
    "tome": "weapon",
    "wand": "weapon",
    "greaves": "feet",
    "blowpipe": "weapon"
};

/**
 * Mappa lo slot di un'arma al tipo di danno principale.
 * @type {Record<string, 'melee'|'ranged'|'magic'>}
 */
export const WEAPON_SLOT_TO_WEAPON_TYPE = {
    "axe": "melee",
    "bow": "ranged",
    "crossbow": "ranged",
    "crux": "magic",
    "dagger": "melee",
    "focus": "magic",
    "gauntlet": "melee",
    "gloves": "melee",
    "greatbow": "ranged",
    "hammer": "melee",
    "handcannon": "ranged",
    "kunai": "ranged",
    "mace": "melee",
    "pot": "ranged",
    "spear": "melee",
    "staff": "magic",
    "sword": "melee",
    "tome": "magic",
    "wand": "magic",
    "blowpipe": "magic"
};

/**
 * Caratteri usati nei tooltip dell'API per identificare l'elemento dell'arma.
 * @type {Record<string, string>}
 */
export const ELEMENT_CHAR_TO_NAME = {
    "\uEA36": "nature",
    "\uEA39": "void",
    "\uEA34": "thunder",
    "\uEA38": "radiant"
};

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Converte uno slot equipaggiamento nella categoria usata da ITEM_DATABASE.
 * @param {string} slot
 * @returns {string}
 */
export function getItemCategoryForSlot(slot) {
    return slot.startsWith('ring') ? RING_ITEM_CATEGORY : slot;
}
