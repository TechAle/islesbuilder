import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import {
    ENHANCED_RESERVATION_RING_DURATION,
    getEnhancedReservationRingEffects
} from '../../../js/modules/itemProcs.js';
import {
    getItemSetEffects,
    getSoulResonatorEffects
} from '../../../js/modules/itemSets.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { makeArcaneWeapon, makeBuild, makeEmptySlot, makeSettings } from '../../helpers/build.js';

const REAPER_SLOTS = ['helmet', 'chestplate', 'leggings', 'boots'];
const REAPER_NAMES = {
    helmet: 'Reaper Helmet',
    chestplate: 'Reaper Chestplate',
    leggings: 'Reaper Leggings',
    boots: 'Reaper Boots'
};

function buildWithRings(ringNames = [], { reaperPieces = [] } = {}) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: makeArcaneWeapon()
    });
    build.activeEquip.ring1 = {
        ...makeEmptySlot(),
        name: ringNames[0] ?? ''
    };
    build.activeEquip.ring2 = {
        ...makeEmptySlot(),
        name: ringNames[1] ?? ''
    };
    REAPER_SLOTS.forEach(slot => {
        build.activeEquip[slot] = {
            ...makeEmptySlot(),
            name: reaperPieces.includes(slot) ? REAPER_NAMES[slot] : ''
        };
    });
    return build;
}

function contextFor(ringNames, settings = {}, options = {}) {
    return {
        build: buildWithRings(ringNames, options),
        settings: makeSettings(settings),
        statsValues: {},
        skillTrees: CLASS_SKILL_TREES
    };
}

function run(build, settings = {}, statsValues = {}) {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });
    return { manager, steps };
}

/**
 * Stessa formula del modulo: probabilità di almeno un critico negli ultimi 5s,
 * resa autoconsistente con il bonus che l'anello stesso aggiunge.
 */
function expectedRingBonus(baseCritPercent, hitsPerSecond) {
    let bonus = 0;
    for (let i = 0; i < 30; i++) {
        const effectiveCrit = Math.min(100, Math.max(0, baseCritPercent + bonus)) / 100;
        const next = 5 * (
            1 - Math.exp(-(hitsPerSecond * effectiveCrit) * ENHANCED_RESERVATION_RING_DURATION)
        );
        if (Math.abs(next - bonus) < 1e-12) return next;
        bonus = next;
    }
    return bonus;
}

describe('Enhanced Reservation Ring', () => {
    it('does nothing without the ring equipped', () => {
        const effects = getEnhancedReservationRingEffects(contextFor([]), 2, 20);

        expect(effects.visible).toBe(false);
        expect(effects.enabled).toBe(false);
        expect(effects.ringCount).toBe(0);
        expect(effects.critChancePercent).toBe(0);
    });

    it('adds the average +5% Crit Chance buff on CRIT', () => {
        const build = buildWithRings(['Enhanced Reservation Ring']);
        const { steps } = run(build, {}, {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 20 }
        });

        const ring = steps.criticalDamage.enhancedReservationRing;
        const expected = expectedRingBonus(20, ring.totalHitsPerSecond);

        expect(ring.visible).toBe(true);
        expect(ring.enabled).toBe(true);
        expect(ring.ringCount).toBe(1);
        expect(ring.durationSeconds).toBe(5);
        expect(ring.critChanceWithoutRingPercent).toBeCloseTo(20, 10);
        expect(ring.critChancePercent).toBeCloseTo(expected, 10);
        expect(ring.uptime).toBeCloseTo(expected / 5, 10);
        expect(steps.criticalDamage.critChance).toBeCloseTo(20 + expected, 10);
        expect(ring.critChancePercent).toBeLessThanOrEqual(5);
    });

    it('does not stack with two rings: the buff stays +5%', () => {
        const one = run(buildWithRings(['Enhanced Reservation Ring']), {}, {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 20 }
        }).steps.criticalDamage;
        const two = run(buildWithRings([
            'Enhanced Reservation Ring',
            'Enhanced Reservation Ring'
        ]), {}, {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 20 }
        }).steps.criticalDamage;

        expect(two.enhancedReservationRing.ringCount).toBe(2);
        expect(two.enhancedReservationRing.uptime).toBeCloseTo(
            one.enhancedReservationRing.uptime,
            10
        );
        expect(two.critChance).toBeCloseTo(one.critChance, 10);
        expect(two.enhancedReservationRing.critChancePercent).toBeLessThanOrEqual(5);
    });

    it('refreshes with each CRIT: more hits mean higher uptime', () => {
        const slow = getEnhancedReservationRingEffects(contextFor([
            'Enhanced Reservation Ring'
        ]), 0.5, 20);
        const fast = getEnhancedReservationRingEffects(contextFor([
            'Enhanced Reservation Ring'
        ]), 5, 20);

        expect(slow.enabled).toBe(true);
        expect(fast.uptime).toBeGreaterThan(slow.uptime);
        expect(slow.uptime).toBeCloseTo(
            expectedRingBonus(20, 0.5) / 5,
            10
        );
        expect(slow.durationSeconds).toBe(5);
    });

    it('shows a reason when there are no hits', () => {
        const effects = getEnhancedReservationRingEffects(contextFor([
            'Enhanced Reservation Ring'
        ]), 0, 20);

        expect(effects.visible).toBe(true);
        expect(effects.enabled).toBe(false);
        expect(effects.reason).toBe('No hits');
    });
});

describe('Soul Resonator', () => {
    it('requires all four Reaper pieces', () => {
        const three = getItemSetEffects(contextFor([], {}, {
            reaperPieces: ['helmet', 'chestplate', 'leggings']
        }));
        const four = getItemSetEffects(contextFor([], {}, {
            reaperPieces: REAPER_SLOTS
        }));

        expect(three.reaperPieces).toBe(3);
        expect(three.hasSoulResonator).toBe(false);
        expect(four.reaperPieces).toBe(4);
        expect(four.hasSoulResonator).toBe(true);
    });

    it('converts kills/s into average stacks and Crit Chance', () => {
        const noKills = getSoulResonatorEffects(contextFor([], {
            soulResonatorKillsPerSecond: 0
        }, { reaperPieces: REAPER_SLOTS }));
        const steady = getSoulResonatorEffects(contextFor([], {
            soulResonatorKillsPerSecond: 0.4
        }, { reaperPieces: REAPER_SLOTS }));
        const capped = getSoulResonatorEffects(contextFor([], {
            soulResonatorKillsPerSecond: 10
        }, { reaperPieces: REAPER_SLOTS }));

        expect(noKills.visible).toBe(true);
        expect(noKills.enabled).toBe(false);
        expect(noKills.averageStacks).toBe(0);
        expect(noKills.reason).toBe('No kills');

        expect(steady.enabled).toBe(true);
        expect(steady.averageStacks).toBe(2);
        expect(steady.critChancePercent).toBe(10);

        expect(capped.averageStacks).toBe(10);
        expect(capped.critChancePercent).toBe(50);
    });

    it('adds Soul Resonator Crit Chance to the shared Crit Chance', () => {
        const build = buildWithRings([], { reaperPieces: REAPER_SLOTS });
        const { steps } = run(build, {
            soulResonatorKillsPerSecond: 0.4
        }, {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 10 }
        });

        expect(steps.criticalDamage.soulResonator.visible).toBe(true);
        expect(steps.criticalDamage.soulResonator.averageStacks).toBe(2);
        expect(steps.criticalDamage.soulResonator.critChancePercent).toBe(10);
        expect(steps.criticalDamage.critChance).toBeCloseTo(20, 10);
    });

    it('hides the set effect when Reaper is not equipped', () => {
        const effects = getSoulResonatorEffects(contextFor([], {
            soulResonatorKillsPerSecond: 2
        }));

        expect(effects.visible).toBe(false);
        expect(effects.reason).toBe('Requires Soul Resonator set');
    });
});

describe('Corrupt Aura (Abyssal Necklace)', () => {
    it('is a 3s periodic passive dealing 125% damage', () => {
        const manager = new SpecialAbilityManager();
        manager.reset();
        manager.registerAbilities('Abyssal Necklace', [{
            kind: 'passive',
            name: 'Corrupt Aura',
            energy: null,
            text: 'While moving, cast an aura every few seconds, dealing 125% damage to nearby enemies.',
            key: null
        }]);

        const passive = manager.getActivePassives({
            build: {
                activeEquip: {
                    weapon: makeArcaneWeapon(),
                    amulet: { ...makeEmptySlot(), name: 'Abyssal Necklace' }
                }
            },
            statsValues: {},
            settings: makeSettings()
        }).find(entry => entry.name === 'Corrupt Aura-Abyssal Necklace');

        expect(passive).toBeDefined();
        expect(passive.damage).toBe(125);
        expect(passive.cooldown).toBe(3);
        expect(passive.periodic).toBe(true);

        manager.reset();
    });

    it('deals damage every 3s and adds hits to the model', () => {
        const specialAbilityManager = new SpecialAbilityManager();
        specialAbilityManager.reset();
        specialAbilityManager.registerAbilities('Abyssal Necklace', [{
            kind: 'passive',
            name: 'Corrupt Aura',
            energy: null,
            text: 'While moving, cast an aura every few seconds, dealing 125% damage to nearby enemies.',
            key: null
        }]);

        const build = makeBuild({
            currentClass: 'archer',
            weapon: makeArcaneWeapon()
        });
        build.activeEquip.amulet = {
            ...makeEmptySlot(),
            name: 'Abyssal Necklace'
        };

        const manager = new DpsManager({ specialAbilityManager });
        const steps = manager.recalculate({
            statsValues: {
                'Arcane Damage': { flat: 100, percent: 0 }
            },
            skillValues: {},
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });

        const aura = steps.attackSpeed.passiveBreakdown
            .find(entry => entry.name === 'Corrupt Aura-Abyssal Necklace');

        expect(aura).toBeDefined();
        expect(aura.periodic).toBe(true);
        expect(aura.hitsPerSecond).toBeCloseTo(1 / 3, 10);
        expect(aura.damagePercent).toBe(125);
        expect(aura.dps).toBeGreaterThan(0);
        expect(steps.attackSpeed.passiveHitsPerSecond).toBeGreaterThanOrEqual(1 / 3);

        specialAbilityManager.reset();
    });
});
