import { BASE_CRIT_DAMAGE } from '../../../data/constants.js';
import {
    getCritChancePercent,
    getCritDamagePercent,
    getCriticalPityCritStats,
    getDeadeyeCritStats,
    getElementalBurstCritStats,
    getEnhancedReservationRingCritStats,
    getFuryResonanceCritStats,
    getItemSetCritStats,
    getSharpshooterCritStats,
    getSoulResonatorCritStats,
    getUltimateCritStats
} from '../critStats.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').CriticalDamageStepResult} CriticalDamageStepResult */

/**
 * Step 4 — Critical Damage.
 *
 * - Crit Damage totale = 50% base + `Crit Damage%` dalle statistiche.
 * - Natural Distillation converte una parte del Crit Damage in Elemental Power:
 *   il Crit Damage usato qui viene ridotto della stessa percentuale.
 * - Colpo critico = danno × (1 + effectiveCritDamage / 100).
 * - Danno medio = non crit × (1 - critChanceEff) + critico × critChanceEff.
 *
 * Il Crit Chance viene limitato solo verso il basso (0), perché nell'API può
 * essere negativo. Sopra il 100% non viene tagliato: il critico ha sempre
 * successo e l'eccesso resta disponibile in `critChanceOverflow`.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const criticalDamageStep = {
    id: 'criticalDamage',
    label: 'Critical Damage',

    /**
     * @param {DamageContext} context
     * @returns {CriticalDamageStepResult}
     */
    run(context) {
        const previous = context.results.warrior
            ?? context.results.sharpshooter
            ?? context.results.damageMultiplier
            ?? context.results.damageModifiers;
        const baseDamage = previous?.damage ?? 0;

        // Funzioni di supporto condivise: Crit Chance e Crit Damage includono
        // esplicitamente Hot Streak e Deadeye.
        const sharpshooter = getSharpshooterCritStats(context);
        const deadeye = getDeadeyeCritStats(context);
        const criticalPity = getCriticalPityCritStats(context);
        const elementalBurst = getElementalBurstCritStats(context);
        const ultimate = getUltimateCritStats(context);
        const itemSets = getItemSetCritStats(context);
        const soulResonator = getSoulResonatorCritStats(context);
        const furyResonance = getFuryResonanceCritStats(context);
        const enhancedReservationRing = getEnhancedReservationRingCritStats(context);
        const sharpshooterCritChance = sharpshooter.hotStreakCritChancePercent;
        const sharpshooterCritDamage = sharpshooter.hotStreakCritDamagePercent;
        const deadeyeCritChance = deadeye.critChanceBonusPercent;
        const deadeyeCritDamage = deadeye.averagePerfectChainCritDamagePercent;
        const criticalPityCritChance = criticalPity.critChanceBonusPercent;
        const elementalBurstCritDamage = elementalBurst.critDamageBonusPercent;

        if (baseDamage <= 0) {
            return {
                baseDamage: 0,
                critChance: 0,
                effectiveCritChance: 0,
                critChanceOverflow: 0,
                critDamagePercent: BASE_CRIT_DAMAGE,
                effectiveCritDamagePercent: BASE_CRIT_DAMAGE,
                sharpshooterCritChancePercent: 0,
                sharpshooterCritDamagePercent: 0,
                deadeye,
                deadeyeCritChancePercent: 0,
                deadeyeCritDamagePercent: 0,
                criticalPity,
                criticalPityCritChancePercent: 0,
                elementalBurst,
                elementalBurstCritDamagePercent: 0,
                ultimate,
                ultimateCritChancePercent: 0,
                ultimateCritDamagePercent: 0,
                itemSets,
                soulResonator,
                furyResonance,
                enhancedReservationRing,
                distillationPercent: 0,
                convertedCritDamagePercent: 0,
                criticalHit: 0,
                averageDamage: 0,
                damage: 0
            };
        }

        const critChance = Math.max(0, getCritChancePercent(context));
        const effectiveCritChance = Math.min(100, critChance);
        const critChanceOverflow = Math.max(0, critChance - 100);
        let critDamagePercent = getCritDamagePercent(context);
        const critDamageRawPercent = critDamagePercent;

        // Natural Distillation è già stata calcolata in Damage Modifiers sulla
        // Crit Damage "di statistica" (base + Crit Damage%). Qui sottraiamo
        // esattamente la stessa quantità: i bonus temporanei come Hot Streak e
        // Perfect Chain non vengono distillati, così EP e riduzione restano
        // coerenti e non si perde Crit Damage senza guadagnare EP.
        const damageModifiers = context.results.damageModifiers;
        const distillationPercent = damageModifiers?.naturalDistillationPercent ?? 0;
        const convertedCritDamagePercent = damageModifiers?.distilledCritDamagePercent ?? 0;
        critDamagePercent -= convertedCritDamagePercent;

        const effectiveCritDamagePercent = critDamagePercent;

        const criticalHit = baseDamage * (1 + effectiveCritDamagePercent / 100);
        const averageDamage = baseDamage * (1 - effectiveCritChance / 100)
            + criticalHit * (effectiveCritChance / 100);

        return {
            baseDamage,
            critChance,
            effectiveCritChance,
            critChanceOverflow,
            critDamagePercent: critDamageRawPercent,
            effectiveCritDamagePercent,
            sharpshooterCritChancePercent: sharpshooterCritChance,
            sharpshooterCritDamagePercent: sharpshooterCritDamage,
            deadeye,
            deadeyeCritChancePercent: deadeyeCritChance,
            deadeyeCritDamagePercent: deadeyeCritDamage,
            criticalPity,
            criticalPityCritChancePercent: criticalPityCritChance,
            elementalBurst,
            elementalBurstCritDamagePercent: elementalBurstCritDamage,
            ultimate,
            ultimateCritChancePercent: ultimate.critChancePercent,
            ultimateCritDamagePercent: ultimate.critDamagePercent,
            itemSets,
            soulResonator,
            furyResonance,
            enhancedReservationRing,
            distillationPercent,
            convertedCritDamagePercent,
            criticalHit,
            averageDamage,
            damage: averageDamage
        };
    },

    /**
     * @param {CriticalDamageStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.baseDamage <= 0) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [
            { label: 'Crit Chance', value: result.critChance, unit: '%' },
            { label: 'Crit Damage', value: result.critDamagePercent, unit: '%' }
        ];

        if (result.deadeye.visible) {
            if (!result.deadeye.enabled) {
                rows.push({
                    label: 'Deadeye',
                    value: result.deadeye.reason ?? 'Not active'
                });
            } else {
                rows.push(
                    { label: 'Deadeye Stacks', value: result.deadeye.averageStacks },
                    {
                        label: 'Deadeye Crit Chance',
                        value: result.deadeyeCritChancePercent,
                        unit: '%'
                    }
                );

                if (result.deadeye.perfectChainLevel > 0) {
                    rows.push(
                        {
                            label: 'Perfect Chain Uptime',
                            value: result.deadeye.perfectChainUptime * 100,
                            unit: '%'
                        },
                        {
                            label: 'Perfect Chain Crit Damage',
                            value: result.deadeyeCritDamagePercent,
                            unit: '%'
                        }
                    );
                }
            }
        }

        if (result.criticalPity?.visible) {
            if (!result.criticalPity.enabled) {
                rows.push({
                    label: 'Critical Pity',
                    value: result.criticalPity.reason ?? 'Not active'
                });
            } else {
                rows.push(
                    {
                        label: 'Pity Stacks',
                        value: result.criticalPity.expectedStacks
                    },
                    {
                        label: 'Pity Crit Chance',
                        value: result.criticalPityCritChancePercent,
                        unit: '%'
                    }
                );
            }
        }

        if (result.elementalBurst?.visible) {
            if (!result.elementalBurst.enabled) {
                rows.push({
                    label: 'Elemental Burst',
                    value: result.elementalBurst.reason ?? 'Not active'
                });
            } else {
                if (result.elementalBurst.elementalChannelingActive) {
                    rows.push({
                        label: 'Elemental Channeling',
                        value: `×${result.elementalBurst.elementalChannelingMultiplier}`
                    });
                }
                rows.push({
                    label: 'Elemental Burst Crit Damage',
                    value: result.elementalBurstCritDamagePercent,
                    unit: '%'
                });
            }
        }

        if (result.itemSets?.hasAlliance) {
            rows.push(
                { label: 'Alliance Players', value: result.itemSets.nearbyPlayers },
                {
                    label: 'Alliance Crit Chance',
                    value: result.itemSets.allianceCritChancePercent,
                    unit: '%'
                }
            );
        }

        if (result.soulResonator?.visible) {
            if (!result.soulResonator.enabled) {
                rows.push({
                    label: 'Soul Resonator',
                    value: result.soulResonator.reason ?? 'Not active'
                });
            } else {
                rows.push(
                    {
                        label: 'Soul Resonator Stacks',
                        value: result.soulResonator.averageStacks
                    },
                    {
                        label: 'Soul Resonator Crit Chance',
                        value: result.soulResonator.critChancePercent,
                        unit: '%'
                    }
                );
            }
        }

        if (result.furyResonance?.visible) {
            if (!result.furyResonance.enabled) {
                rows.push({
                    label: "Fury's Resonance",
                    value: result.furyResonance.reason ?? 'Not active'
                });
            } else {
                rows.push(
                    {
                        label: "Fury's Resonance Uptime",
                        value: result.furyResonance.uptime * 100,
                        unit: '%'
                    },
                    {
                        label: "Fury's Resonance Crit Chance",
                        value: result.furyResonance.averageCritChancePercent,
                        unit: '%'
                    }
                );
            }
        }

        if (result.enhancedReservationRing?.visible) {
            if (!result.enhancedReservationRing.enabled) {
                rows.push({
                    label: 'Enhanced Reservation Ring',
                    value: result.enhancedReservationRing.reason ?? 'Not active'
                });
            } else {
                rows.push(
                    {
                        label: 'Reservation Ring Uptime',
                        value: result.enhancedReservationRing.uptime * 100,
                        unit: '%'
                    },
                    {
                        label: 'Reservation Ring Crit Chance',
                        value: result.enhancedReservationRing.critChancePercent,
                        unit: '%'
                    }
                );
            }
        }

        if (result.ultimate?.visible) {
            if (!result.ultimate.enabled) {
                rows.push({
                    label: 'Ultimatum',
                    value: result.ultimate.reason ?? 'Not active'
                });
            } else {
                rows.push(
                    {
                        label: 'Ultimate Uptime',
                        value: result.ultimate.uptime * 100,
                        unit: '%'
                    }
                );

                if (result.ultimateCritChancePercent > 0) {
                    rows.push({
                        label: 'Ultimate Crit Chance',
                        value: result.ultimateCritChancePercent,
                        unit: '%'
                    });
                }

                if (result.ultimateCritDamagePercent > 0) {
                    rows.push({
                        label: 'Ultimate Crit Damage',
                        value: result.ultimateCritDamagePercent,
                        unit: '%'
                    });
                }
            }
        }

        if (result.distillationPercent > 0) {
            rows.push(
                {
                    label: 'Natural Distillation',
                    value: -result.convertedCritDamagePercent,
                    unit: '%',
                    help: `${result.distillationPercent}% del Crit Damage convertito in Elemental Power a 2×.`
                },
                {
                    label: 'Effective Crit Damage',
                    value: result.effectiveCritDamagePercent,
                    unit: '%'
                }
            );
        }

        rows.push(
            { label: 'Critical Hit', value: result.criticalHit },
            { label: 'Average Damage', value: result.averageDamage }
        );

        return rows;
    }
};
