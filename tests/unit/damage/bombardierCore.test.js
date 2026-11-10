import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import {
    getBurstCore,
    getBurstHitsPerBurst,
    getCoreKey,
    hasBombardierCore
} from '../../../js/modules/classes/core.js';
import { getBurstCycleEffects, getBurstHitsPerSecond } from '../../../js/modules/classes/mage.js';
import { selectStats } from '../../../js/store/selectors.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function makeWeapon({ damageType = 'Throwables', weaponType = 'ranged' } = {}) {
    return {
        name: 'Test Weapon',
        stats: {
            'Damage Type': damageType,
            'Default Attack': 100,
            'Weapon Type': weaponType,
            [`${damageType} Damage`]: 100
        }
    };
}

function makeContext({ settings = {} } = {}) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: makeWeapon(),
        core: { name: 'Bombardier Core', stats: { 'Throwables Damage': '20%' } }
    });
    return {
        weapon: build.activeEquip.weapon,
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    };
}

function run(settings = {}) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: makeWeapon(),
        core: { name: 'Bombardier Core', stats: { 'Throwables Damage': '20%' } }
    });
    const { statsValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
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

describe('Bombardier Core', () => {
    it('riconosce il core e configura il burst', () => {
        const context = makeContext();

        expect(getCoreKey(context)).toBe('bombardier');
        expect(hasBombardierCore(context)).toBe(true);
        expect(getBurstCore(context)).toMatchObject({
            name: 'Bombardier Core',
            damagePercent: 950,
            energyCost: 50,
            activeSeconds: 1,
            hitInterval: 1,
            hitsPerBurst: 1,
            cycleSeconds: 30,
            buffDamagePercent: 0,
            requiresMelee: false
        });
    });

    it('fa un solo hit da 950% per cast', () => {
        const context = makeContext({ settings: { useBurst: true } });
        const core = getBurstCore(context);

        expect(getBurstHitsPerBurst(core)).toBe(1);
        expect(getBurstCycleEffects(context).burstCycle).toBe(30);
        expect(getBurstHitsPerSecond(context)).toBeCloseTo(1 / 30, 10);
    });

    it('applica 200% + 3×100% + 9×50% e il +20% Throwables', () => {
        const { manager, steps } = run({ useBurst: true });

        // Throwables Damage 100 × 1.20 = 120.
        expect(steps.damageModifiers.damage).toBeCloseTo(120, 10);

        // 120 × reverse(100%) × 950% = 1140 per cast.
        expect(steps.burst.burstDamagePerHit).toBeCloseTo(1140, 10);
        expect(steps.burst.burstHitsPerSecond).toBeCloseTo(1 / 30, 10);
        expect(steps.burst.burstDps).toBeCloseTo(38, 10);

        // Attack DPS 120 / 0.6 = 200. Totale = 238.
        expect(steps.attackSpeed.dps).toBeCloseTo(200, 10);
        expect(manager.getDps()).toBeCloseTo(238, 10);

        // Energia: 50 / 30s.
        expect(steps.burst.burstEnergyPerSecond).toBeCloseTo(50 / 30, 10);
    });

    it('non fa danno burst con la burst spenta', () => {
        const { steps } = run();

        expect(steps.burst.available).toBe(true);
        expect(steps.burst.enabled).toBe(false);
        expect(steps.burst.burstDps).toBe(0);
    });

    it('mantiene invariati gli hit per burst degli altri core', () => {
        const mage = makeBuild({
            currentClass: 'mage',
            weapon: makeWeapon({ damageType: 'Arcane', weaponType: 'magic' }),
            core: { name: 'Mage Core', stats: {} }
        });
        const swordsman = makeBuild({
            currentClass: 'warrior',
            weapon: makeWeapon({ damageType: 'Slash', weaponType: 'melee' }),
            core: { name: 'Swordsman Core', stats: {} }
        });

        expect(getBurstHitsPerBurst(getBurstCore({
            build: mage,
            settings: makeSettings()
        }))).toBeCloseTo(10 / 0.75, 10);
        expect(getBurstHitsPerBurst(getBurstCore({
            build: swordsman,
            settings: makeSettings()
        }))).toBeCloseTo(10 / 0.5, 10);
    });
});
