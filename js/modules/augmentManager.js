import { AUGMENT_DATABASE, AUGMENT_OVERRIDES } from '../data/augments.js';
import { MAX_AUGMENTS_PER_ITEM } from '../data/constants.js';

/** @typedef {import('../data/types.js').BuildState} BuildState */
/** @typedef {import('../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../data/types.js').AugmentDefinition} AugmentDefinition */
/** @typedef {import('../data/types.js').AugmentLevel} AugmentLevel */
/** @typedef {import('../data/types.js').AugmentEffect} AugmentEffect */

/**
 * @typedef {Object} EquippedAugment
 * @property {string} slot
 * @property {string} itemName
 * @property {AugmentDefinition} augment
 * @property {AugmentLevel} level
 */

/**
 * @typedef {Object} AugmentEffects
 * @property {Array<{chance: number, damagePercent: number, cooldown: number, enemies: number}>} chainLightning
 * @property {Array<{chance: number, damagePercent: number}>} combo
 * @property {Array<{damagePercent: number, cooldown: number}>} deathburst
 * @property {Array<{perHit: number, duration: number, maxHits: number}>} infected
 * @property {number} enragedPercent
 * @property {number} executionPercent
 * @property {number} firstStrikePercent
 * @property {number} hunterPercent
 * @property {number} prosecutionPercent
 * @property {number} natureBlessFlat
 * @property {boolean} hasCombo
 * @property {boolean} hasChainLightning
 * @property {boolean} hasDeathburst
 * @property {boolean} hasInfected
 * @property {boolean} hasEnraged
 * @property {boolean} hasExecution
 * @property {boolean} hasFirstStrike
 * @property {boolean} hasHunter
 * @property {boolean} hasProsecution
 * @property {boolean} hasEffects
 */

/**
 * Popola il database dagli augment restituiti dall'API.
 * @param {any[]|null|undefined} apiAugments
 */
export function registerAugments(apiAugments) {
    AUGMENT_DATABASE.length = 0;

    (apiAugments ?? []).forEach(raw => {
        const definition = buildAugmentDefinition(raw);
        if (definition) AUGMENT_DATABASE.push(definition);
    });
}

/**
 * @param {any} raw
 * @returns {AugmentDefinition|null}
 */
function buildAugmentDefinition(raw) {
    if (!raw || typeof raw.name !== 'string') return null;

    const name = raw.name;
    const group = String(raw.group ?? 'utility');
    const rarity = String(raw.rarity ?? 'Common');
    const goesIn = raw.goesIn === 'weapon' || raw.goesIn === 'armor'
        ? raw.goesIn
        : (group === 'damage' ? 'weapon' : 'armor');
    const override = AUGMENT_OVERRIDES.effects[name] ?? { type: 'none' };
    const effect = /** @type {AugmentEffect} */ ({ ...override });

    const tiers = Array.isArray(raw.tiers) ? raw.tiers : [];
    /** @type {Array<{tier: number, value: any, effect: any, numeral: any}>} */
    const parsedTiers = tiers
        .map((/** @type {any} */ tier) => ({
            tier: Number(tier?.tier),
            value: tier?.value,
            effect: tier?.effect,
            numeral: tier?.numeral
        }))
        .filter((/** @type {{tier: number}} */ tier) => Number.isInteger(tier.tier) && tier.tier > 0)
        .sort((/** @type {{tier: number}} */ a, /** @type {{tier: number}} */ b) => a.tier - b.tier);

    const parsed = parsedTiers.map((/** @type {any} */ tier) => parseTier(tier, effect.type));
    const known = new Map(parsed.map((/** @type {{tier: number, value: number, params: Record<string, number>}} */ entry) => [entry.tier, entry]));

    const valueGrowth = getGrowth(name, rarity, parsed.map((/** @type {{tier: number, value: number}} */ entry) => ({
        tier: entry.tier,
        value: entry.value
    })));

    const params = collectParams(parsed);
    const fallback = AUGMENT_OVERRIDES.fallback?.[name];
    const levels = parsed.length === 0 && fallback
        ? Array.from({ length: 6 }, (_, index) => ({
            level: index + 1,
            value: fallback.base + fallback.growth * index
        }))
        : buildLevels(known, valueGrowth, params);

    return {
        name,
        goesIn,
        group,
        rarity,
        effect,
        levels
    };
}

/**
 * @param {{tier: number, value: string|number|undefined, effect: string|undefined, numeral: string|undefined}} rawTier
 * @param {string} effectType
 * @returns {{tier: number, value: number, params: Record<string, number>}}
 */
function parseTier(rawTier, effectType) {
    const text = String(rawTier.effect ?? '');
    const rawValue = parseNumber(rawTier.value);
    const params = {};

    switch (effectType) {
        case 'chainLightning': {
            const chance = firstPercent(text) || rawValue;
            params.damagePercent = numberAfter(text, /at\s+([\d.,]+)\s*%\s*damage/i) ?? chance;
            params.cooldown = numberAfter(text, /([\d.,]+)\s*s\s*cooldown/i) ?? 4;
            params.enemies = numberAfter(text, /chain\s+([\d.,]+)/i) ?? 2;
            return { tier: rawTier.tier, value: chance, params };
        }
        case 'combo': {
            const chance = firstPercent(text) || rawValue;
            params.damagePercent = numberAfter(text, /at\s+([\d.,]+)\s*%\s*damage/i) ?? 50;
            return { tier: rawTier.tier, value: chance, params };
        }
        case 'deathburst': {
            params.cooldown = numberAfter(text, /([\d.,]+)\s*s\s*cooldown/i) ?? 5;
            return { tier: rawTier.tier, value: firstPercent(text) || rawValue, params };
        }
        case 'infected': {
            params.duration = numberAfter(text, /for\s+([\d.,]+)\s*s/i) ?? 2;
            params.maxHits = numberAfter(text, /up to\s+([\d.,]+)\s*hits/i) ?? 10;
            return { tier: rawTier.tier, value: firstPercent(text) || rawValue, params };
        }
        case 'natureBless': {
            return {
                tier: rawTier.tier,
                value: numberAfter(text, /by\s+([\d.,]+)/i) ?? rawValue,
                params
            };
        }
        default:
            return {
                tier: rawTier.tier,
                value: firstPercent(text) || rawValue,
                params
            };
    }
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function parseNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const match = String(value ?? '').match(/[+-]?\d+(?:[.,]\d+)?/);
    if (!match) return 0;
    const parsed = Number.parseFloat(match[0].replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @param {string} text
 * @returns {number}
 */
function firstPercent(text) {
    const match = String(text).match(/([+-]?\d+(?:[.,]\d+)?)\s*%/);
    if (!match) return 0;
    const parsed = Number.parseFloat(match[1].replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @param {string} text
 * @param {RegExp} regex
 * @returns {number|null}
 */
function numberAfter(text, regex) {
    const match = String(text).match(regex);
    if (!match) return null;
    const parsed = Number.parseFloat(match[1].replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * @param {string} name
 * @param {string} rarity
 * @param {Array<{tier: number, value: number}>} parsed
 * @returns {number}
 */
function getGrowth(name, rarity, parsed) {
    const override = AUGMENT_OVERRIDES.growth[name] ?? AUGMENT_OVERRIDES.growth[rarity];
    if (Number.isFinite(override)) return Number(override);

    if (parsed.length >= 2) {
        const first = parsed[0];
        const last = parsed[parsed.length - 1];
        const distance = last.tier - first.tier;
        if (distance > 0) return (last.value - first.value) / distance;
    }

    return 0;
}

/**
 * @param {Array<{tier: number, value: number, params: Record<string, number>}>} parsed
 * @returns {Record<string, Array<{tier: number, value: number}>>}
 */
function collectParams(parsed) {
    /** @type {Record<string, Array<{tier: number, value: number}>>} */
    const result = {};

    parsed.forEach(entry => {
        Object.entries(entry.params).forEach(([key, value]) => {
            (result[key] ??= []).push({ tier: entry.tier, value });
        });
    });

    return result;
}

/**
 * @param {Map<number, {value: number, params: Record<string, number>}>} known
 * @param {number} valueGrowth
 * @param {Record<string, Array<{tier: number, value: number}>>} params
 * @returns {AugmentLevel[]}
 */
function buildLevels(known, valueGrowth, params) {
    const knownEntries = [...known.values()];
    if (knownEntries.length === 0) return [];

    const firstKnownTier = [...known.keys()][0];
    const firstKnownValue = known.get(firstKnownTier)?.value ?? 0;
    const valueBase = firstKnownValue - valueGrowth * (firstKnownTier - 1);
    /** @type {Record<string, number>} */
    const paramGrowth = {};
    /** @type {Record<string, number>} */
    const paramBase = {};

    Object.entries(params).forEach(([key, entries]) => {
        const first = entries[0];
        const last = entries[entries.length - 1];
        const growth = entries.length >= 2
            ? (last.value - first.value) / Math.max(1, last.tier - first.tier)
            : 0;
        paramGrowth[key] = growth;
        paramBase[key] = first.value - growth * (first.tier - 1);
    });

    return Array.from({ length: 6 }, (_, index) => {
        const level = index + 1;
        const knownLevel = known.get(level);
        if (knownLevel) {
            return {
                level,
                value: knownLevel.value,
                ...(Object.keys(knownLevel.params).length > 0
                    ? { params: { ...knownLevel.params } }
                    : {})
            };
        }

        /** @type {Record<string, number>} */
        const levelParams = Object.fromEntries(
            Object.keys(params).map(key => [
                key,
                paramBase[key] + paramGrowth[key] * (level - 1)
            ])
        );

        return {
            level,
            value: valueBase + valueGrowth * (level - 1),
            ...(Object.keys(levelParams).length > 0 ? { params: levelParams } : {})
        };
    });
}

/**
 * Augment equipaggiati, risolti in definizione + livello.
 * @param {BuildState|null|undefined} build
 * @returns {EquippedAugment[]}
 */
export function getEquippedAugments(build) {
    /** @type {EquippedAugment[]} */
    const equipped = [];

    Object.entries(build?.activeEquip ?? {}).forEach(([slot, item]) => {
        const kind = slot === 'weapon' ? 'weapon' : 'armor';

        (item?.augments ?? []).slice(0, MAX_AUGMENTS_PER_ITEM).forEach(raw => {
            const parsed = parseAugment(raw);
            if (!parsed) return;
            if (parsed.augment.goesIn !== kind) return;

            equipped.push({
                slot,
                itemName: String(item?.name ?? ''),
                augment: parsed.augment,
                level: parsed.level
            });
        });
    });

    return equipped;
}

/**
 * Bonus alle statistiche forniti dagli augment.
 * @param {BuildState|null|undefined} build
 * @returns {Array<{stat: string, value: number, percent: boolean}>}
 */
export function getAugmentStatBonuses(build) {
    /** @type {Array<{stat: string, value: number, percent: boolean}>} */
    const bonuses = [];
    let natureBlessFlat = 0;

    getEquippedAugments(build).forEach(({ augment, level }) => {
        if (augment.effect.type === 'stat' && augment.effect.stat) {
            bonuses.push({
                stat: augment.effect.stat,
                value: level.value,
                percent: augment.effect.percent !== false
            });
        }

        if (augment.effect.type === 'natureBless') {
            natureBlessFlat = Math.max(natureBlessFlat, level.value);
        }
    });

    if (natureBlessFlat > 0) {
        bonuses.push({
            stat: 'Elemental Power',
            value: natureBlessFlat,
            percent: false
        });
    }

    return bonuses;
}

/**
 * Effetti degli augment che modificano il danno o generano danno extra.
 * @param {DamageContext} context
 * @returns {AugmentEffects}
 */
export function getAugmentEffects(context) {
    const executionHp = clampPercent(context.settings?.executionHpPercent ?? 50) / 100;
    const prosecutionHp = clampPercent(context.settings?.prosecutionHpPercent ?? 50) / 100;
    const enragedHp = clampPercent(context.settings?.enragedHpPercent ?? 50) / 100;

    /** @type {AugmentEffects} */
    const effects = {
        chainLightning: [],
        combo: [],
        deathburst: [],
        infected: [],
        enragedPercent: 0,
        executionPercent: 0,
        firstStrikePercent: 0,
        hunterPercent: 0,
        prosecutionPercent: 0,
        natureBlessFlat: 0,
        hasCombo: false,
        hasChainLightning: false,
        hasDeathburst: false,
        hasInfected: false,
        hasEnraged: false,
        hasExecution: false,
        hasFirstStrike: false,
        hasHunter: false,
        hasProsecution: false,
        hasEffects: false
    };

    getEquippedAugments(context.build).forEach(({ augment, level }) => {
        const type = augment.effect.type;

        switch (type) {
            case 'chainLightning':
                effects.hasChainLightning = true;
                effects.chainLightning.push({
                    chance: level.value,
                    damagePercent: level.params?.damagePercent ?? 20,
                    cooldown: level.params?.cooldown ?? 4,
                    enemies: level.params?.enemies ?? 2
                });
                break;
            case 'combo':
                effects.hasCombo = true;
                effects.combo.push({
                    chance: level.value,
                    damagePercent: level.params?.damagePercent ?? 50
                });
                break;
            case 'deathburst':
                effects.hasDeathburst = true;
                effects.deathburst.push({
                    damagePercent: level.value,
                    cooldown: level.params?.cooldown ?? 5
                });
                break;
            case 'infected': {
                // Due Infected non si stackano: il debuff è unico.
                // Se ne sono equipaggiati più di uno, vale solo il più forte.
                const candidate = {
                    perHit: level.value,
                    duration: level.params?.duration ?? 2,
                    maxHits: level.params?.maxHits ?? 10
                };
                const current = effects.infected[0];
                const candidateMax = candidate.perHit * candidate.maxHits;
                const currentMax = current ? current.perHit * current.maxHits : -1;

                if (!current || candidateMax > currentMax) {
                    effects.infected[0] = candidate;
                }
                effects.hasInfected = true;
                break;
            }
            case 'enraged':
                effects.hasEnraged = true;
                effects.enragedPercent += level.value * (1 - enragedHp);
                break;
            case 'execution':
                effects.hasExecution = true;
                effects.executionPercent += level.value * (1 - executionHp);
                break;
            case 'firstStrike':
                effects.hasFirstStrike = true;
                effects.firstStrikePercent += level.value;
                break;
            case 'hunter':
                effects.hasHunter = true;
                effects.hunterPercent += level.value;
                break;
            case 'prosecution':
                effects.hasProsecution = true;
                effects.prosecutionPercent += level.value * prosecutionHp;
                break;
            case 'natureBless':
                // Nature's Bless non si stacka: vale solo la copia più forte.
                effects.natureBlessFlat = Math.max(effects.natureBlessFlat, level.value);
                break;
            default:
                break;
        }
    });

    effects.hasEffects = effects.hasCombo
        || effects.hasChainLightning
        || effects.hasDeathburst
        || effects.hasInfected
        || effects.hasEnraged
        || effects.hasExecution
        || effects.hasFirstStrike
        || effects.hasHunter
        || effects.hasProsecution
        || effects.natureBlessFlat !== 0;

    return effects;
}

/**
 * Cerca un augment per nome, senza distinzione maiuscole/minuscole.
 * @param {string} name
 * @returns {AugmentDefinition|null}
 */
export function findAugment(name) {
    const target = String(name ?? '').trim().toLowerCase();
    return AUGMENT_DATABASE.find(augment => augment.name.toLowerCase() === target) ?? null;
}

/**
 * Interpreta `Hunter 1` / `Arcane Damage 3`.
 * @param {string} raw
 * @returns {{augment: AugmentDefinition, level: AugmentLevel}|null}
 */
export function parseAugment(raw) {
    const match = String(raw ?? '').trim().match(/^(.*?)\s+(\d+)$/);
    if (!match) return null;

    const augment = findAugment(match[1]);
    if (!augment) return null;

    const levelNumber = Number.parseInt(match[2], 10);
    const level = augment.levels.find(entry => entry.level === levelNumber);
    if (!level) return null;

    return { augment, level };
}

/**
 * Nomi suggeriti per uno slot: `Hunter 1` ... `Hunter 6`.
 * @param {'weapon'|'armor'} kind
 * @returns {string[]}
 */
export function getAugmentSuggestions(kind) {
    return AUGMENT_DATABASE
        .filter(augment => augment.goesIn === kind)
        .flatMap(augment => augment.levels.map(level => `${augment.name} ${level.level}`));
}

/**
 * @param {number} value
 * @returns {number}
 */
function clampPercent(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
}
