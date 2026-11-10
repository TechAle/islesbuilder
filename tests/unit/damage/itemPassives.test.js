import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { applyDefenseDamage, simulateEnemy } from '../../../js/modules/enemySimulator.js';
import {
    getBackstabEffects,
    getDemeanorExecutionEffects,
    getDeteriorateEffects,
    getFuryResonanceEffects,
    getReclamationEffects,
    getStormEchoEffects
} from '../../../js/modules/itemPassives.js';
import {
    MAGE_CORE,
    makeArcaneWeapon,
    makeBuild,
    makeSettings
} from '../../helpers/build.js';

const STORM_LEGACY_PIECES = [
    "Storm's Legacy Helmet",
    "Storm's Legacy Chestplate",
    "Storm's Legacy Leggings",
    "Storm's Legacy Boots"
];

function run({ weaponName = 'Test Weapon', armor = [], core = null, settings = {} } = {}) {
    const weapon = makeArcaneWeapon();
    weapon.name = weaponName;
    const build = makeBuild({
        currentClass: 'mage',
        weapon,
        core,
        armor: armor.map(name => ({ name, stats: {} }))
    });
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 0 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });
    return { manager, steps, build };
}

describe('Backstab (Oblivion)', () => {
    it('is hidden without Oblivion equipped', () => {
        const { steps } = run({ weaponName: 'Test Weapon' });
        expect(steps.damageModifiers.backstabVisible).toBe(false);
        expect(steps.damageModifiers.backstabDamagePercent).toBe(0);
    });

    it('scales +40% by the backstab probability', () => {
        const base = run({ weaponName: 'Test Weapon' }).steps.damageModifiers.damage;
        const always = run({
            weaponName: 'Oblivion',
            settings: { backstabChancePercent: 100 }
        }).steps.damageModifiers;
        const half = run({
            weaponName: 'Oblivion',
            settings: { backstabChancePercent: 50 }
        }).steps.damageModifiers;

        expect(always.backstabVisible).toBe(true);
        expect(always.backstabDamagePercent).toBe(40);
        expect(always.damage).toBeCloseTo(base * 1.4, 10);

        expect(half.backstabDamagePercent).toBe(20);
        expect(half.damage).toBeCloseTo(base * 1.2, 10);
    });

    it('reports the effect values', () => {
        const effects = getBackstabEffects({
            build: { activeEquip: { weapon: { name: 'Oblivion' } } },
            settings: makeSettings({ backstabChancePercent: 25 })
        });

        expect(effects.enabled).toBe(true);
        expect(effects.maxPercent).toBe(40);
        expect(effects.damagePercent).toBe(10);
    });
});

describe('Deteriorate (Aetheris)', () => {
    it('is a permanent -25% defense with a 5-hit ramp', () => {
        const { steps } = run({ weaponName: 'Aetheris' });

        expect(steps.damageModifiers.deteriorateVisible).toBe(true);
        expect(steps.damageModifiers.deteriorateDefenseReductionPercent).toBe(25);
        expect(steps.damageModifiers.deteriorateRampHits).toBe(5);

        const effects = getDeteriorateEffects({
            build: { activeEquip: { weapon: { name: 'Aetheris' } } }
        });
        expect(effects.firstHitDefenseReductionPercent).toBe(0);
    });

    it('uses no reduction on the first hit and the first 5 hits in the simulator', () => {
        const options = {
            health: 100_000,
            defense: 500,
            firstHitDamage: 1000,
            dps: 1000,
            hitsPerSecond: 2,
            energyPerSecond: 0,
            maxEnergy: 100
        };
        const steady = simulateEnemy({
            ...options,
            defenseReductionPercent: 25
        });
        const ramp = simulateEnemy({
            ...options,
            defenseReductionPercent: 25,
            defenseReductionRampHits: 5
        });

        expect(steady.realFirstHitDamage).toBeCloseTo(
            applyDefenseDamage(1000, 375),
            10
        );
        expect(ramp.realFirstHitDamage).toBeCloseTo(
            applyDefenseDamage(1000, 500),
            10
        );
        expect(ramp.defenseReductionRampHits).toBe(5);
        expect(ramp.realDps).toBeCloseTo(steady.realDps, 10);
        expect(ramp.timeToKill).toBeGreaterThan(steady.timeToKill);
    });
});

describe('Reclamation (Storm’s Legacy)', () => {
    it('requires a Storm’s Legacy piece', () => {
        const none = getReclamationEffects({
            build: { activeEquip: {} },
            settings: makeSettings({ reclamationKillsPerSecond: 2 })
        });
        const one = getReclamationEffects({
            build: {
                activeEquip: {
                    helmet: { name: "Storm's Legacy Helmet" }
                }
            },
            settings: makeSettings({ reclamationKillsPerSecond: 2 })
        });

        expect(none.visible).toBe(false);
        expect(none.cooldownReductionSeconds).toBe(0);
        expect(one.visible).toBe(true);
        expect(one.pieces).toBe(1);
        expect(one.cooldownReductionSeconds).toBe(2);
    });

    it('reduces the Ultimate cooldown by 1s per kill/s', () => {
        const without = run({
            core: MAGE_CORE,
            armor: STORM_LEGACY_PIECES,
            settings: { useBurst: true, reclamationKillsPerSecond: 0 }
        }).steps.burst;
        const withKills = run({
            core: MAGE_CORE,
            armor: STORM_LEGACY_PIECES,
            settings: { useBurst: true, reclamationKillsPerSecond: 2 }
        }).steps.burst;

        expect(without.hasReclamation).toBe(true);
        expect(without.reclamationCooldownReduction).toBe(0);
        expect(withKills.reclamationCooldownReduction).toBe(2);
        expect(withKills.burstCycle).toBeCloseTo(without.burstCycle - 2, 10);
    });
});

describe('Execution (Demeanor of Dragons)', () => {
    it('uses the same missing-HP logic as the Execution augment', () => {
        const halfHp = run({
            weaponName: 'Demeanor of Dragons',
            settings: { executionHpPercent: 50 }
        }).steps.augmentFinal;
        const fullHp = run({
            weaponName: 'Demeanor of Dragons',
            settings: { executionHpPercent: 100 }
        }).steps.augmentFinal;
        const noHp = run({
            weaponName: 'Demeanor of Dragons',
            settings: { executionHpPercent: 0 }
        }).steps.augmentFinal;

        expect(halfHp.hasDragonExecution).toBe(true);
        expect(halfHp.dragonExecutionPercent).toBe(15);
        expect(fullHp.dragonExecutionPercent).toBe(0);
        expect(noHp.dragonExecutionPercent).toBe(30);
    });

    it('is hidden without Demeanor of Dragons', () => {
        const { steps } = run({ weaponName: 'Test Weapon' });
        expect(steps.augmentFinal.hasDragonExecution).toBe(false);
        expect(steps.augmentFinal.dragonExecutionPercent).toBe(0);
    });

    it('reports the effect values', () => {
        const effects = getDemeanorExecutionEffects({
            build: { activeEquip: { weapon: { name: 'Demeanor of Dragons' } } },
            settings: makeSettings({ executionHpPercent: 25 })
        });

        expect(effects.enabled).toBe(true);
        expect(effects.maxPercent).toBe(30);
        expect(effects.executionPercent).toBe(22.5);
    });
});

describe("Fury's Resonance (Storm's Fury)", () => {
    it('adds average Crit Chance based on the burst cycle', () => {
        const { steps } = run({
            weaponName: "Storm's Fury",
            core: MAGE_CORE,
            settings: { useBurst: true }
        });
        const fury = steps.criticalDamage.furyResonance;

        expect(fury.visible).toBe(true);
        expect(fury.enabled).toBe(true);
        expect(fury.uptime).toBeCloseTo(4 / 30, 10);
        expect(fury.averageCritChancePercent).toBeCloseTo(10 * (4 / 30), 10);
        expect(steps.criticalDamage.critChance).toBeCloseTo(10 * (4 / 30), 10);
    });

    it('does nothing without the burst enabled', () => {
        const { steps } = run({ weaponName: "Storm's Fury" });
        const fury = steps.criticalDamage.furyResonance;

        expect(fury.visible).toBe(true);
        expect(fury.enabled).toBe(false);
        expect(fury.averageCritChancePercent).toBe(0);
        expect(steps.criticalDamage.critChance).toBe(0);
    });

    it('reports the effect values', () => {
        const effects = getFuryResonanceEffects({
            build: { activeEquip: { weapon: { name: "Storm's Fury" } } },
            settings: makeSettings({ useBurst: true })
        }, 28);

        expect(effects.enabled).toBe(true);
        expect(effects.uptime).toBeCloseTo(4 / 28, 10);
        expect(effects.averageCritChancePercent).toBeCloseTo(10 * (4 / 28), 10);
    });
});

describe("Storm's Echo (Storm's Legacy)", () => {
    it('gives 3 stacks and +45% damage with at least 1 hit/s', () => {
        const { steps } = run({ armor: STORM_LEGACY_PIECES });

        expect(steps.damageModifiers.stormEchoVisible).toBe(true);
        expect(steps.damageModifiers.stormEchoStacks).toBe(3);
        expect(steps.damageModifiers.stormEchoDamagePercent).toBe(45);
        // Danno base 100 × 1.45.
        expect(steps.damageModifiers.damage).toBeCloseTo(145, 10);
    });

    it('requires all four Storm’s Legacy pieces', () => {
        const noSet = run({ armor: STORM_LEGACY_PIECES.slice(0, 3) });
        const fullSet = run({ armor: STORM_LEGACY_PIECES });

        expect(noSet.steps.damageModifiers.stormEchoVisible).toBe(false);
        expect(noSet.steps.damageModifiers.stormEchoDamagePercent).toBe(0);
        expect(fullSet.steps.damageModifiers.stormEchoVisible).toBe(true);
    });

    it('has 0 stacks on the first hit', () => {
        const { steps } = run({
            armor: STORM_LEGACY_PIECES,
            settings: { firstHit: true }
        });

        expect(steps.damageModifiers.stormEchoVisible).toBe(true);
        expect(steps.damageModifiers.stormEchoStacks).toBe(0);
        expect(steps.damageModifiers.stormEchoDamagePercent).toBe(0);
        expect(steps.damageModifiers.damage).toBeCloseTo(100, 10);
    });

    it('scales stacks below 1 hit/s', () => {
        const build = makeBuild({
            currentClass: 'mage',
            weapon: makeArcaneWeapon(),
            armor: STORM_LEGACY_PIECES.map(name => ({ name, stats: {} }))
        });
        const effects = getStormEchoEffects({
            build,
            settings: makeSettings()
        }, 0.5);

        expect(effects.averageStacks).toBe(1.5);
        expect(effects.damagePercent).toBe(22.5);
        expect(effects.ultimateConsumePercent).toBe(75);
    });

    it('adds the Ultimate consume bonus to Burst DPS', () => {
        const withoutSet = run({
            core: MAGE_CORE,
            settings: { useBurst: true }
        }).steps.burst;
        const withSet = run({
            armor: STORM_LEGACY_PIECES,
            core: MAGE_CORE,
            settings: { useBurst: true }
        }).steps.burst;

        expect(withoutSet.hasStormEcho).toBe(false);
        expect(withoutSet.stormEchoConsumeDps).toBe(0);
        expect(withSet.hasStormEcho).toBe(true);
        expect(withSet.stormEchoUltimatePercent).toBe(150);
        expect(withSet.stormEchoConsumeDps).toBeGreaterThan(0);
    });
});
