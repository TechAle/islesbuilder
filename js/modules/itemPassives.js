/** @typedef {import('../data/types.js').DamageContext} DamageContext */

/** Nome dell'arma con Backstab. */
const OBLIVION_NAME = 'oblivion';

/** Nome dell'arma con Deteriorate. */
const AETHERIS_NAME = 'aetheris';

/** Nome dell'arma con Execution. */
const DEMEANOR_OF_DRAGONS_NAME = 'demeanor of dragons';

/** Backstab: bonus massimo. */
export const BACKSTAB_MAX_PERCENT = 40;

/** Deteriorate: riduzione per hit. */
export const DETERIORATE_PER_HIT_PERCENT = 5;

/** Deteriorate: riduzione massima. */
export const DETERIORATE_MAX_PERCENT = 25;

/** Deteriorate: hit necessari per arrivare al massimo. */
export const DETERIORATE_MAX_STACKS = 5;

/** Execution di Demeanor of Dragons: bonus massimo. */
export const DRAGON_EXECUTION_MAX_PERCENT = 30;

/** Reclamation: secondi rimossi dal cooldown dell'Ultimate per kill. */
export const RECLAMATION_SECONDS_PER_KILL = 1;

/**
 * Nome dell'arma equipaggiata, normalizzato.
 * @param {DamageContext} context
 * @returns {string}
 */
function getWeaponName(context) {
    return String(context.build?.activeEquip?.weapon?.name ?? '')
        .trim()
        .toLowerCase();
}

/**
 * @param {DamageContext} context
 * @param {string} name
 * @returns {boolean}
 */
function hasWeapon(context, name) {
    return getWeaponName(context) === name;
}

/**
 * Backstab (Oblivion): +40% danno quando si colpisce da dietro.
 *
 * Lo slider rappresenta la probabilità media di attaccare da dietro, quindi il
 * bonus medio è:
 *
 *   bonus = 40% × probabilità
 *
 * @param {DamageContext} context
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   maxPercent: number,
 *   chancePercent: number,
 *   damagePercent: number,
 *   reason: string|null
 * }}
 */
export function getBackstabEffects(context) {
    const visible = hasWeapon(context, OBLIVION_NAME);
    const chanceSetting = Number(context.settings?.backstabChancePercent);
    const chancePercent = Number.isFinite(chanceSetting)
        ? Math.max(0, Math.min(100, chanceSetting))
        : 100;
    const damagePercent = visible ? BACKSTAB_MAX_PERCENT * (chancePercent / 100) : 0;

    return {
        visible,
        enabled: visible && chancePercent > 0,
        maxPercent: BACKSTAB_MAX_PERCENT,
        chancePercent,
        damagePercent,
        reason: visible ? null : 'Requires Oblivion'
    };
}

/**
 * Deteriorate (Aetheris): -5% Generic Defense per hit, fino a -25%.
 *
 * Il DPS normale assume lo stack massimo attivo. Nel first hit la riduzione è
 * 0%. Nell'Enemy Simulator le prime 5 hit non hanno lo stack: la rampa viene
 * gestita dal simulatore tramite `rampHits`.
 *
 * @param {DamageContext} context
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   perHitPercent: number,
 *   maxPercent: number,
 *   rampHits: number,
 *   defenseReductionPercent: number,
 *   firstHitDefenseReductionPercent: number,
 *   reason: string|null
 * }}
 */
export function getDeteriorateEffects(context) {
    const visible = hasWeapon(context, AETHERIS_NAME);

    return {
        visible,
        enabled: visible,
        perHitPercent: DETERIORATE_PER_HIT_PERCENT,
        maxPercent: DETERIORATE_MAX_PERCENT,
        rampHits: DETERIORATE_MAX_STACKS,
        defenseReductionPercent: visible ? DETERIORATE_MAX_PERCENT : 0,
        firstHitDefenseReductionPercent: 0,
        reason: visible ? null : 'Requires Aetheris'
    };
}

/**
 * Execution (Demeanor of Dragons): +30% danni in base alla vita mancante.
 * Usa la stessa formula dello augment Execution:
 *
 *   bonus = 30% × (1 - HP nemico / 100)
 *
 * @param {DamageContext} context
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   maxPercent: number,
 *   enemyHpPercent: number,
 *   executionPercent: number,
 *   reason: string|null
 * }}
 */
export function getDemeanorExecutionEffects(context) {
    const visible = hasWeapon(context, DEMEANOR_OF_DRAGONS_NAME);
    const hpSetting = Number(context.settings?.executionHpPercent);
    const enemyHpPercent = Number.isFinite(hpSetting)
        ? Math.max(0, Math.min(100, hpSetting))
        : 50;
    const executionPercent = visible
        ? DRAGON_EXECUTION_MAX_PERCENT * (1 - enemyHpPercent / 100)
        : 0;

    return {
        visible,
        enabled: visible,
        maxPercent: DRAGON_EXECUTION_MAX_PERCENT,
        enemyHpPercent,
        executionPercent,
        reason: visible ? null : 'Requires Demeanor of Dragons'
    };
}

/**
 * Reclamation (Storm's Legacy): ogni kill riduce di 1s il cooldown
 * dell'Ultimate. Il passive è presente su ogni pezzo, non stacka.
 *
 * @param {DamageContext} context
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   pieces: number,
 *   killsPerSecond: number,
 *   secondsPerKill: number,
 *   cooldownReductionSeconds: number,
 *   reason: string|null
 * }}
 */
export function getReclamationEffects(context) {
    const equipped = context.build?.activeEquip ?? {};
    const armorSlots = /** @type {import('../data/types.js').EquipSlot[]} */ ([
        'helmet',
        'chestplate',
        'leggings',
        'boots'
    ]);
    const pieces = armorSlots.filter(slot => (
        /storm.?s legacy/i.test(String(equipped[slot]?.name ?? ''))
    )).length;
    const visible = pieces > 0;
    const killsSetting = Number(context.settings?.reclamationKillsPerSecond);
    const killsPerSecond = Number.isFinite(killsSetting)
        ? Math.max(0, killsSetting)
        : 0;

    return {
        visible,
        enabled: visible && killsPerSecond > 0,
        pieces,
        killsPerSecond,
        secondsPerKill: RECLAMATION_SECONDS_PER_KILL,
        cooldownReductionSeconds: visible
            ? killsPerSecond * RECLAMATION_SECONDS_PER_KILL
            : 0,
        reason: visible ? null : "Requires Storm's Legacy"
    };
}

/**
 * Effetti passivi degli oggetti equipaggiati.
 * @param {DamageContext} context
 * @returns {{
 *   backstab: ReturnType<typeof getBackstabEffects>,
 *   deteriorate: ReturnType<typeof getDeteriorateEffects>,
 *   dragonExecution: ReturnType<typeof getDemeanorExecutionEffects>,
 *   reclamation: ReturnType<typeof getReclamationEffects>
 * }}
 */
export function getItemPassiveEffects(context) {
    return {
        backstab: getBackstabEffects(context),
        deteriorate: getDeteriorateEffects(context),
        dragonExecution: getDemeanorExecutionEffects(context),
        reclamation: getReclamationEffects(context)
    };
}
