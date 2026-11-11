import { BASE_ELEMENTAL_POWER } from '../../../data/constants.js';
import {
    NATURAL_DISTILLATION_EP_MULTIPLIER,
    getCrystalInsightsElementalPowerPercent,
    getElementalChannelingPercent,
    getElementalSynergyEffects,
    getNaturalDistillationEffects,
    getSupportOrbEffects
} from '../../classes/mage.js';
import { getAttackInterval } from '../attackTiming.js';
import { getEnergyRegen } from '../energy.js';
import { getCritChancePercent, getCritTotalHitsPerSecond, getDistillableCritDamagePercent } from '../critStats.js';
import { getItemPassiveEffects, getStormEchoEffects } from '../../itemPassives.js';
import { findFlat, findPercent } from '../statLookup.js';
import { getWeaponClass } from '../weaponProps.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').DamageModifiersStepResult} DamageModifiersStepResult */
/** @typedef {import('../../../data/types.js').EquipSlotData} EquipSlotData */

/**
 * Elemento dell'arma (es. "thunder", "nature", "void", "radiant").
 * @param {EquipSlotData|null|undefined} weapon
 * @returns {string}
 */
function getWeaponElement(weapon) {
    const raw = weapon?.stats?.['element'];
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/**
 * Trasforma una chiave lowercase in una label leggibile (magic => Magic).
 * @param {string} value
 * @returns {string}
 */
function capitalize(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Step 2 — Damage Modifiers.
 *
 * Il danno è:
 *   1) `base × (1 + damageType%)` per il tipo danno
 *   2) `× (1 + elementalDamage% × EP / 100)` per l'elemento
 *   3) `+ flatDamage × mastery% / 100` per Melee/Ranged/Magic Mastery
 *
 * Il mastery usa il danno flat dell'arma (prima del Default Attack) e viene
 * aggiunto come valore piatto, non dentro i bracket moltiplicativi.
 * L'Elemental Power totale è `(BASE + flat) * (1 + percent / 100)` e scala
 * la percentuale del danno elementale del nostro elemento.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const damageModifiersStep = {
    id: 'damageModifiers',
    label: 'Damage Modifiers',

    /**
     * @param {DamageContext} context
     * @returns {DamageModifiersStepResult}
     */
    run(context) {
        const base = context.results.baseDamage;
        const baseDamage = base?.baseDamage ?? 0;
        const damageType = base?.damageType ?? null;
        const weaponClass = getWeaponClass(context.weapon);
        const element = getWeaponElement(context.weapon);
        const itemPassives = getItemPassiveEffects(context);
        const stormEcho = getStormEchoEffects(
            context,
            getCritTotalHitsPerSecond(context)
        );

        if (baseDamage <= 0) {
            return {
                baseDamage: 0,
                damageType,
                weaponClass,
                element,
                elementSpecificPercent: 0,
                elementalResistancePercent: 0,
                abilityElementalPowerPercent: 0,
                elementalChannelingPercent: 0,
                percent: 0,
                masteryPercent: 0,
                masteryBonus: 0,
                elementalPower: BASE_ELEMENTAL_POWER,
                elementalPowerPercent: 0,
                crystalInsightsPercent: 0,
                naturalDistillationPercent: 0,
                distilledCritDamagePercent: 0,
                distilledElementalPowerFlat: 0,
                elementalSynergyFlat: 0,
                elementalDamagePercent: 0,
                effectiveElementalPercent: 0,
                blueOrbs: 0,
                blueDamageMultiplier: 1,
                blueDamagePercent: 0,
                genericDamagePercent: 0,
                backstabVisible: itemPassives.backstab.visible,
                backstabEnabled: false,
                backstabChancePercent: itemPassives.backstab.chancePercent,
                backstabMaxPercent: itemPassives.backstab.maxPercent,
                backstabDamagePercent: 0,
                deteriorateVisible: itemPassives.deteriorate.visible,
                deteriorateDefenseReductionPercent: 0,
                deteriorateRampHits: itemPassives.deteriorate.rampHits,
                stormEchoVisible: stormEcho.visible,
                stormEchoEnabled: false,
                stormEchoStacks: 0,
                stormEchoDamagePercent: 0,
                stormEchoUltimatePercent: 0,
                stormEchoPieces: stormEcho.pieces,
                damage: 0,
                modifiers: []
            };
        }

        /** @type {Array<{label: string, percent: number}>} */
        const modifiers = [];
        const seen = new Set();

        /**
         * @param {string} statName
         * @param {string} label
         */
        const addModifier = (statName, label) => {
            const key = label.toLowerCase();
            if (!statName || seen.has(key)) return;

            seen.add(key);
            modifiers.push({ label, percent: findPercent(context.statsValues, statName) });
        };

        addModifier(`${damageType} Damage`, `${damageType} Damage`);
        if (weaponClass) addModifier(`${capitalize(weaponClass)} Damage`, `${capitalize(weaponClass)} Damage`);

        const typePercent = findPercent(context.statsValues, `${damageType} Damage`);
        const masteryPercent = weaponClass
            ? findPercent(context.statsValues, `${capitalize(weaponClass)} Damage`)
            : 0;
        // `Damage` è il bonus generico (es. Glass Cannon dell'arciere): vale
        // per qualsiasi tipo di danno, indipendentemente dall'arma.
        const genericDamagePercent = findPercent(context.statsValues, 'Damage');

        // Elemental channeling (Mage) aggiunge il suo valore a qualsiasi elemento.
        const elementalChanneling = getElementalChannelingPercent(context);
        const elementalResistancePercent = element
            ? context.specialAbilityManager?.getElementalResistancePercent(context, element) ?? 0
            : 0;
        const elementSpecificPercent = (element
            ? findPercent(context.statsValues, `${capitalize(element)} Damage`)
            : 0) - elementalResistancePercent;
        const elementalDamagePercent = element
            ? elementSpecificPercent + elementalChanneling
            : 0;

        // Elemental Power totale: (base + flat) * (1 + percent/100).
        // Crystal Insights e le abilità equipaggiate aggiungono EP%.
        const critChancePercent = getCritChancePercent(context);
        const attackInterval = getAttackInterval(context);
        const crystalInsightsPercent = getCrystalInsightsElementalPowerPercent(
            context,
            critChancePercent,
            attackInterval
        );
        const abilityElementalPowerPercent = context.specialAbilityManager
            ?.getAbilityElementalPowerPercent(context) ?? 0;

        const elementalPowerFlat = findFlat(context.statsValues, 'Elemental Power');
        // Base distillabile centralizzata in critStats: include base, statistica
        // ed Elemental Burst, ma non i buff temporanei.
        const distillableCritDamagePercent = getDistillableCritDamagePercent(context);
        const naturalDistillation = getNaturalDistillationEffects(
            context,
            distillableCritDamagePercent
        );
        const naturalDistillationPercent = naturalDistillation.distillationPercent;
        const distilledCritDamagePercent = naturalDistillation.convertedCritDamagePercent;
        const distilledElementalPowerFlat = naturalDistillation.elementalPowerFlat;

        const energyRegen = getEnergyRegen(context);
        const elementalSynergy = getElementalSynergyEffects(context, energyRegen);

        const elementalPowerPercent = findPercent(context.statsValues, 'Elemental Power')
            + crystalInsightsPercent
            + abilityElementalPowerPercent;
        const elementalPower = (BASE_ELEMENTAL_POWER
            + elementalPowerFlat
            + distilledElementalPowerFlat
            + elementalSynergy.elementalPowerFlat)
            * (1 + elementalPowerPercent / 100);

        // Scaling: percent * (EP / 100).
        const effectiveElementalPercent = elementalDamagePercent * (elementalPower / 100);

        // Il mastery (Melee/Ranged/Magic) aumenta il danno della stessa
        // percentuale indicata dal nodo.
        const damageBeforeMastery = baseDamage
            * (1 + typePercent / 100)
            * (1 + effectiveElementalPercent / 100);
        const masteryBonus = damageBeforeMastery * (masteryPercent / 100);

        // Le BLUE orb aumentano il danno subito dal nemico.
        // Sul first hit non possono essere attive: richiedono hit precedenti.
        const firstHit = context.settings?.firstHit === true;
        const supportOrbs = getSupportOrbEffects(context, critChancePercent);
        const blueDamageMultiplier = firstHit ? 1 : supportOrbs.blueDamageMultiplier;

        const damage = Math.max(0,
            (damageBeforeMastery + masteryBonus)
            * blueDamageMultiplier
        ) * (1 + genericDamagePercent / 100)
            * (1 + itemPassives.backstab.damagePercent / 100)
            * (1 + stormEcho.damagePercent / 100);

        return {
            baseDamage,
            damageType,
            weaponClass,
            element,
            elementSpecificPercent,
            elementalChannelingPercent: elementalChanneling,
            percent: typePercent,
            masteryPercent,
            masteryBonus,
            elementalPower,
            elementalPowerPercent,
            crystalInsightsPercent,
            abilityElementalPowerPercent,
            elementalResistancePercent,
            naturalDistillationPercent,
            distilledCritDamagePercent,
            distilledElementalPowerFlat,
            elementalSynergyFlat: elementalSynergy.elementalPowerFlat,
            elementalDamagePercent,
            effectiveElementalPercent,
            blueOrbs: firstHit ? 0 : supportOrbs.activeBlueOrbs,
            blueDamageMultiplier,
            blueDamagePercent: (blueDamageMultiplier - 1) * 100,
            genericDamagePercent,
            backstabVisible: itemPassives.backstab.visible,
            backstabEnabled: itemPassives.backstab.enabled,
            backstabChancePercent: itemPassives.backstab.chancePercent,
            backstabMaxPercent: itemPassives.backstab.maxPercent,
            backstabDamagePercent: itemPassives.backstab.damagePercent,
            deteriorateVisible: itemPassives.deteriorate.visible,
            deteriorateDefenseReductionPercent:
                itemPassives.deteriorate.defenseReductionPercent,
            deteriorateRampHits: itemPassives.deteriorate.rampHits,
            stormEchoVisible: stormEcho.visible,
            stormEchoEnabled: stormEcho.enabled,
            stormEchoStacks: stormEcho.averageStacks,
            stormEchoDamagePercent: stormEcho.damagePercent,
            stormEchoUltimatePercent: stormEcho.ultimateConsumePercent,
            stormEchoPieces: stormEcho.pieces,
            damage,
            modifiers
        };
    },

    /**
     * @param {DamageModifiersStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.baseDamage <= 0) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [
            { label: 'Damage Modifiers', value: result.percent, unit: '%' }
        ];

        if (result.genericDamagePercent !== 0) {
            rows.push({ label: 'Damage%', value: result.genericDamagePercent, unit: '%' });
        }

        if (result.backstabVisible) {
            rows.push(
                {
                    label: 'Backstab Chance',
                    value: result.backstabChancePercent ?? 0,
                    unit: '%'
                },
                {
                    label: 'Backstab Damage%',
                    value: result.backstabDamagePercent ?? 0,
                    unit: '%',
                    help: `Oblivion: +${result.backstabMaxPercent ?? 40}% backstab damage, weighted by chance.`
                }
            );
        }

        if (result.deteriorateVisible) {
            rows.push({
                label: 'Deteriorate Defense',
                value: -(result.deteriorateDefenseReductionPercent ?? 0),
                unit: '%',
                help: 'Aetheris: -5% defense per hit, up to -25%. Against monsters the first 5 hits have no stack.'
            });
        }

        if (result.stormEchoVisible) {
            rows.push(
                {
                    label: "Storm's Echo Stacks",
                    value: result.stormEchoStacks ?? 0,
                    help: `Average stacks: at least 1 hit/s is needed for the max (3 stacks).`
                },
                {
                    label: "Storm's Echo Damage%",
                    value: result.stormEchoDamagePercent ?? 0,
                    unit: '%'
                }
            );
        }

        const hasElementalDamage = result.elementalDamagePercent !== 0;
        if (result.distilledElementalPowerFlat > 0) {
            rows.push({
                label: 'Natural Distillation EP',
                value: result.distilledElementalPowerFlat,
                help: `Crit Damage converted ×${NATURAL_DISTILLATION_EP_MULTIPLIER} Elemental Power.`
            });
        }
        if (hasElementalDamage) {
            if (result.crystalInsightsPercent > 0) {
                rows.push({ label: 'Crystal Insights EP', value: result.crystalInsightsPercent, unit: '%' });
            }
            if (result.elementalSynergyFlat > 0) {
                rows.push({ label: 'Elemental Synergy EP', value: result.elementalSynergyFlat });
            }
            if (result.abilityElementalPowerPercent > 0) {
                rows.push({ label: 'Elemental Power%', value: result.abilityElementalPowerPercent, unit: '%' });
            }
            if (result.elementalResistancePercent !== 0) {
                rows.push({
                    label: `${capitalize(result.element)} Resistance%`,
                    value: result.elementalResistancePercent,
                    unit: '%'
                });
            }
            if (result.blueDamagePercent > 0) {
                rows.push({ label: 'Blue Orb Bonus', value: result.blueDamagePercent, unit: '%' });
            }
            rows.push({ label: 'Elemental Power', value: result.elementalPower });
        }

        if (result.masteryPercent !== 0) {
            const masteryName = result.weaponClass
                ? `${capitalize(result.weaponClass)} Mastery`
                : 'Mastery';

            rows.push({
                label: masteryName,
                value: result.masteryPercent,
                unit: '%',
                help: `${masteryName} increases damage by ${result.masteryPercent}%.`
            });
            rows.push({
                label: `${masteryName} Damage`,
                value: result.masteryBonus,
                help: `Flat damage added by ${masteryName}: ${result.masteryPercent}% of the hit damage before mastery.`
            });
        }

        rows.push({ label: 'Damage', value: result.damage });
        return rows;
    }
};
