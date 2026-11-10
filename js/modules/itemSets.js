/** @typedef {import('../data/types.js').DamageContext} DamageContext */

/** Slot che compongono il set Aetherbloom. */
export const AETHERBLOOM_SLOTS = /** @type {import('../data/types.js').EquipSlot[]} */ ([
    'helmet',
    'chestplate',
    'leggings',
    'boots'
]);

/** Nome del set, usato per riconoscere i pezzi equipaggiati. */
export const AETHERBLOOM_SET_NAME = 'aetherbloom';

/** Nome del set Reaper, usato per Soul Resonator. */
export const REAPER_SET_NAME = 'reaper';

/** Soul Resonator: Crit Chance per stack. */
export const SOUL_RESONATOR_CRIT_PER_STACK = 5;

/** Soul Resonator: durata degli stack, in secondi. */
export const SOUL_RESONATOR_DURATION = 5;

/** Soul Resonator: stack massimi. */
export const SOUL_RESONATOR_MAX_STACKS = 10;

/** Execution dell'Aetherbloom: 10% massimo, non stacka tra pezzi. */
export const AETHERBLOOM_EXECUTION_PERCENT = 10;

/** Alliance: +3% Crit Chance per giocatore vicino, massimo 6. */
export const ALLIANCE_CRIT_CHANCE_PER_PLAYER = 3;
export const ALLIANCE_MAX_PLAYERS = 6;

/** @param {unknown} item */
function isAetherbloomPiece(item) {
    const name = String(/** @type {{name?: unknown}} */ (item)?.name ?? '')
        .trim()
        .toLowerCase();
    return name.includes(AETHERBLOOM_SET_NAME);
}

/** @param {unknown} item */
function isReaperPiece(item) {
    const name = String(/** @type {{name?: unknown}} */ (item)?.name ?? '')
        .trim()
        .toLowerCase();
    return name.includes(REAPER_SET_NAME);
}

/** @param {number} value */
function clampPercent(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
}

/**
 * Effetti dei set equipaggiati.
 *
 * Aetherbloom:
 * - Execution è un passive presente sui pezzi: si attiva una sola volta.
 * - Alliance è un set bonus: si attiva solo con tutti e 4 i pezzi.
 * - Nessuno dei due stacka per numero di pezzi.
 *
 * @param {DamageContext} context
 * @returns {import('../data/types.js').ItemSetEffectsResult}
 */
export function getItemSetEffects(context) {
    const equipped = context.build?.activeEquip ?? {};
    const aetherbloomSlots = AETHERBLOOM_SLOTS.filter(slot => (
        isAetherbloomPiece(equipped[slot])
    ));
    const aetherbloomPieces = aetherbloomSlots.length;
    const hasAetherbloom = aetherbloomPieces > 0;
    const hasAlliance = aetherbloomPieces === AETHERBLOOM_SLOTS.length;

    const reaperPieces = AETHERBLOOM_SLOTS.filter(slot => (
        isReaperPiece(equipped[slot])
    )).length;
    const hasSoulResonator = reaperPieces === AETHERBLOOM_SLOTS.length;

    const enemyHpPercent = clampPercent(context.settings?.executionHpPercent ?? 50);
    // Stessa formula dell'augment Execution, ma valore fisso 10%.
    const executionPercent = hasAetherbloom
        ? AETHERBLOOM_EXECUTION_PERCENT * (1 - enemyHpPercent / 100)
        : 0;

    const nearbyPlayers = Math.min(
        ALLIANCE_MAX_PLAYERS,
        Math.max(0, Number(context.settings?.nearbyPlayers) || 0)
    );
    const allianceCritChancePercent = hasAlliance
        ? ALLIANCE_CRIT_CHANCE_PER_PLAYER * nearbyPlayers
        : 0;

    return {
        aetherbloomPieces,
        aetherbloomSlots,
        hasAetherbloom,
        hasExecution: hasAetherbloom,
        executionPercent,
        hasAlliance,
        nearbyPlayers,
        allianceCritChancePercent,
        executionMaxPercent: AETHERBLOOM_EXECUTION_PERCENT,
        allianceCritChancePerPlayer: ALLIANCE_CRIT_CHANCE_PER_PLAYER,
        allianceMaxPlayers: ALLIANCE_MAX_PLAYERS,
        reaperPieces,
        hasSoulResonator
    };
}

/**
 * Soul Resonator: ogni kill dà +5% Crit Chance per 5s, fino a 10 stack.
 * Il set si attiva con tutti e 4 i pezzi Reaper.
 *
 * @param {DamageContext} context
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   hasSet: boolean,
 *   reaperPieces: number,
 *   killsPerSecond: number,
 *   durationSeconds: number,
 *   maxStacks: number,
 *   averageStacks: number,
 *   critChancePerStackPercent: number,
 *   critChancePercent: number,
 *   reason: string|null
 * }}
 */
export function getSoulResonatorEffects(context) {
    const itemSets = getItemSetEffects(context);
    const killsSetting = Number(context.settings?.soulResonatorKillsPerSecond);
    const killsPerSecond = Number.isFinite(killsSetting)
        ? Math.max(0, killsSetting)
        : 0;
    const averageStacks = itemSets.hasSoulResonator
        ? Math.min(
            SOUL_RESONATOR_MAX_STACKS,
            killsPerSecond * SOUL_RESONATOR_DURATION
        )
        : 0;
    const critChancePercent = averageStacks * SOUL_RESONATOR_CRIT_PER_STACK;

    let reason = null;
    if (!itemSets.hasSoulResonator) {
        reason = 'Requires Soul Resonator set';
    } else if (killsPerSecond <= 0) {
        reason = 'No kills';
    }

    return {
        visible: itemSets.hasSoulResonator,
        enabled: itemSets.hasSoulResonator && killsPerSecond > 0,
        hasSet: itemSets.hasSoulResonator,
        reaperPieces: itemSets.reaperPieces,
        killsPerSecond,
        durationSeconds: SOUL_RESONATOR_DURATION,
        maxStacks: SOUL_RESONATOR_MAX_STACKS,
        averageStacks,
        critChancePerStackPercent: SOUL_RESONATOR_CRIT_PER_STACK,
        critChancePercent,
        reason
    };
}
