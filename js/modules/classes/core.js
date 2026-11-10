import {
    ARCHER_BURST_DAMAGE_PERCENT,
    ARCHER_BURST_HITS,
    ASSASSIN_BURST_ACTIVE_SECONDS,
    ASSASSIN_BURST_DAMAGE_PERCENT,
    BOMBARDIER_BURST_DAMAGE_PERCENT,
    BOMBARDIER_BURST_HITS,
    BURST_ACTIVE_SECONDS,
    BURST_DAMAGE_PERCENT,
    BURST_ENERGY_COST,
    BURST_HIT_INTERVAL,
    BURST_INTERVAL,
    SWORDSMAN_BURST_DAMAGE_PERCENT,
    SWORDSMAN_BURST_HIT_INTERVAL
} from '../../data/constants.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/**
 * Chiave del core equipaggiato, ricavata dal nome dell'oggetto.
 * @param {DamageContext} context
 * @returns {'mage'|'archer'|'assassin'|'swordsman'|'bombardier'|null}
 */
export function getCoreKey(context) {
    const core = context.build?.activeEquip?.core;
    if (typeof core?.name !== 'string') return null;

    const name = core.name.toLowerCase();
    if (name.includes('mage')) return 'mage';
    if (name.includes('archer')) return 'archer';
    if (name.includes('assassin')) return 'assassin';
    if (name.includes('swordsman')) return 'swordsman';
    if (name.includes('bombardier')) return 'bombardier';
    return null;
}

/**
 * Verifica se il core equipaggiato è un Mage Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasMageCore(context) {
    return getCoreKey(context) === 'mage';
}

/**
 * Verifica se il core equipaggiato è un Archer Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasArcherCore(context) {
    return getCoreKey(context) === 'archer';
}

/**
 * Verifica se il core equipaggiato è un Assassin Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasAssassinCore(context) {
    return getCoreKey(context) === 'assassin';
}

/**
 * Verifica se il core equipaggiato è un Swordsman Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasSwordsmanCore(context) {
    return getCoreKey(context) === 'swordsman';
}

/**
 * Verifica se il core equipaggiato è un Bombardier Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasBombardierCore(context) {
    return getCoreKey(context) === 'bombardier';
}

/**
 * Verifica se il core equipaggiato abilita una burst.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasBurstCore(context) {
    return getCoreKey(context) !== null;
}

/**
 * Configurazione della burst del core equipaggiato.
 *
 * I core condividono costo energetico e ciclo base di 30s. Cambiano durata,
 * intervallo, danno e tipo di effetto:
 *
 * - Mage Core: burst a colpi ogni 0.75s.
 * - Archer Core: Barrage da 30 frecce, 66% ciascuna.
 * - Assassin Core: buff di danno per 6s.
 * - Swordsman Core: proc melee ogni 0.5s, solo con armi melee.
 * - Bombardier Core: un singolo hit da 950% (200% + 3×100% + 9×50%).
 *
 * @param {DamageContext} context
 * @returns {{
 *   key: 'mage'|'archer'|'assassin'|'swordsman'|'bombardier',
 *   name: string,
 *   damagePercent: number,
 *   energyCost: number,
 *   activeSeconds: number,
 *   hitInterval: number,
 *   hitsPerBurst?: number,
 *   cycleSeconds: number,
 *   buffDamagePercent: number,
 *   requiresMelee: boolean
 * }|null}
 */
export function getBurstCore(context) {
    const key = getCoreKey(context);

    if (key === 'mage') {
        return {
            key,
            name: 'Mage Core',
            damagePercent: BURST_DAMAGE_PERCENT,
            energyCost: BURST_ENERGY_COST,
            activeSeconds: BURST_ACTIVE_SECONDS,
            hitInterval: BURST_HIT_INTERVAL,
            cycleSeconds: BURST_INTERVAL,
            buffDamagePercent: 0,
            requiresMelee: false
        };
    }

    if (key === 'archer') {
        return {
            key,
            name: 'Archer Core',
            damagePercent: ARCHER_BURST_DAMAGE_PERCENT,
            energyCost: BURST_ENERGY_COST,
            activeSeconds: BURST_ACTIVE_SECONDS,
            hitInterval: BURST_HIT_INTERVAL,
            hitsPerBurst: ARCHER_BURST_HITS,
            cycleSeconds: BURST_INTERVAL,
            buffDamagePercent: 0,
            requiresMelee: false
        };
    }

    if (key === 'assassin') {
        return {
            key,
            name: 'Assassin Core',
            damagePercent: 0,
            energyCost: BURST_ENERGY_COST,
            activeSeconds: ASSASSIN_BURST_ACTIVE_SECONDS,
            hitInterval: 0,
            cycleSeconds: BURST_INTERVAL,
            buffDamagePercent: ASSASSIN_BURST_DAMAGE_PERCENT,
            requiresMelee: false
        };
    }

    if (key === 'swordsman') {
        return {
            key,
            name: 'Swordsman Core',
            damagePercent: SWORDSMAN_BURST_DAMAGE_PERCENT,
            energyCost: BURST_ENERGY_COST,
            activeSeconds: BURST_ACTIVE_SECONDS,
            hitInterval: SWORDSMAN_BURST_HIT_INTERVAL,
            cycleSeconds: BURST_INTERVAL,
            buffDamagePercent: 0,
            requiresMelee: true
        };
    }

    if (key === 'bombardier') {
        return {
            key,
            name: 'Bombardier Core',
            // 200% + 3 × 100% + 9 × 50%: un solo hit per cast.
            damagePercent: BOMBARDIER_BURST_DAMAGE_PERCENT,
            energyCost: BURST_ENERGY_COST,
            activeSeconds: 1,
            hitInterval: 1,
            hitsPerBurst: BOMBARDIER_BURST_HITS,
            cycleSeconds: BURST_INTERVAL,
            buffDamagePercent: 0,
            requiresMelee: false
        };
    }

    return null;
}

/**
 * Numero di hit per cast della burst.
 * Se il core non dichiara `hitsPerBurst`, usa `activeSeconds / hitInterval`.
 * @param {{activeSeconds: number, hitInterval: number, hitsPerBurst?: number}|null} core
 * @returns {number}
 */
export function getBurstHitsPerBurst(core) {
    if (!core) return 0;
    if (Number.isFinite(core.hitsPerBurst)) {
        return Math.max(0, /** @type {number} */ (core.hitsPerBurst));
    }
    return core.hitInterval > 0
        ? Math.max(0, core.activeSeconds / core.hitInterval)
        : 0;
}
