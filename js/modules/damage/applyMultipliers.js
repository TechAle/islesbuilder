/**
 * Applica più aumenti percentuali in modo additivo, sulla stessa base.
 *
 * Esempio: 9% e 15% → +24%, non 1.09 × 1.15.
 *
 * @param {number} damage
 * @param {number[]} percents
 * @returns {{totalPercent: number, multiplier: number, damage: number}}
 */
export function applyAdditiveMultipliers(damage, percents) {
    const totalPercent = percents.reduce(
        (sum, percent) => sum + (Number.isFinite(percent) ? percent : 0),
        0
    );

    return {
        totalPercent,
        multiplier: 1 + totalPercent / 100,
        damage: damage * (1 + totalPercent / 100)
    };
}
