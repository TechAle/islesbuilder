/** @typedef {import('../data/types.js').DamageContext} DamageContext */

/** Nome dell'anello che dà il buff. */
const ENHANCED_RESERVATION_RING_NAME = 'enhanced reservation ring';

/** Bonus Crit Chance del buff. */
export const ENHANCED_RESERVATION_RING_CRIT_PERCENT = 5;

/** Durata del buff, in secondi. */
export const ENHANCED_RESERVATION_RING_DURATION = 5;

/** Slot in cui può comparire l'anello. */
const RING_SLOTS = /** @type {import('../data/types.js').EquipSlot[]} */ ([
    'ring1',
    'ring2'
]);

/**
 * Numero di Enhanced Reservation Ring equipaggiati.
 * L'effetto non stacka: due anelli danno comunque un solo buff da +5%.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getEnhancedReservationRingCount(context) {
    return RING_SLOTS.filter(slot => (
        String(context.build?.activeEquip?.[slot]?.name ?? '')
            .trim()
            .toLowerCase()
            .includes(ENHANCED_RESERVATION_RING_NAME)
    )).length;
}

/**
 * Effetto medio dell'Enhanced Reservation Ring.
 *
 * Ogni critico dà +5% Crit Chance per 5s e rinfresca la durata. Il buff non
 * stacka: con due anelli il bonus resta +5%.
 *
 * L'uptime medio è stimato come probabilità che ci sia almeno un critico
 * negli ultimi 5 secondi:
 *
 *   uptime = 1 - e^(-crit/s × 5)
 *
 * Il calcolo è reso autoconsistente perché il buff aumenta la Crit Chance,
 * che a sua volta aumenta il rate dei critici.
 *
 * @param {DamageContext} context
 * @param {number} totalHitsPerSecond
 * @param {number} critChanceWithoutRingPercent
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   ringCount: number,
 *   buffCritChancePercent: number,
 *   durationSeconds: number,
 *   totalHitsPerSecond: number,
 *   critChanceWithoutRingPercent: number,
 *   uptime: number,
 *   critChancePercent: number,
 *   reason: string|null
 * }}
 */
export function getEnhancedReservationRingEffects(
    context,
    totalHitsPerSecond,
    critChanceWithoutRingPercent
) {
    const ringCount = getEnhancedReservationRingCount(context);
    const visible = ringCount > 0;
    const hits = Number.isFinite(totalHitsPerSecond)
        ? Math.max(0, totalHitsPerSecond)
        : 0;
    const baseCrit = Number.isFinite(critChanceWithoutRingPercent)
        ? Math.min(100, Math.max(0, critChanceWithoutRingPercent))
        : 0;

    let bonus = 0;
    if (visible && hits > 0 && baseCrit > 0) {
        for (let i = 0; i < 12; i++) {
            const effectiveCrit = Math.min(100, Math.max(0, baseCrit + bonus)) / 100;
            const critRate = hits * effectiveCrit;
            const next = ENHANCED_RESERVATION_RING_CRIT_PERCENT * (
                1 - Math.exp(-critRate * ENHANCED_RESERVATION_RING_DURATION)
            );
            if (Math.abs(next - bonus) < 1e-9) {
                bonus = next;
                break;
            }
            bonus = next;
        }
    }

    let reason = null;
    if (!visible) {
        reason = 'Requires Enhanced Reservation Ring';
    } else if (hits <= 0) {
        reason = 'No hits';
    } else if (baseCrit <= 0) {
        reason = 'No Crit Chance';
    }

    return {
        visible,
        enabled: bonus > 0,
        ringCount,
        buffCritChancePercent: ENHANCED_RESERVATION_RING_CRIT_PERCENT,
        durationSeconds: ENHANCED_RESERVATION_RING_DURATION,
        totalHitsPerSecond: hits,
        critChanceWithoutRingPercent: baseCrit,
        uptime: bonus / ENHANCED_RESERVATION_RING_CRIT_PERCENT,
        critChancePercent: bonus,
        reason
    };
}
