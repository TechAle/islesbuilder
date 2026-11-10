import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import { getCoreBuffEffects } from '../../../js/modules/classes/coreBuff.js';
import { getBurstCore, getCoreKey } from '../../../js/modules/classes/core.js';
import { getBurstCycleEffects, getBurstHitsPerSecond } from '../../../js/modules/classes/mage.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function makeWeapon({ damageType = 'Slash', weaponType = 'melee' } = {}) {
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

function makeContext({ coreName, weapon, settings = {} }) {
    const build = makeBuild({
        currentClass: 'warrior',
        weapon,
        core: { name: coreName, stats: {} }
    });
    return {
        weapon: build.activeEquip.weapon,
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    };
}

function run({ coreName, weapon, settings = {} }) {
    const build = makeBuild({
        currentClass: 'warrior',
        weapon,
        core: {
            name: coreName,
            stats: coreName === 'Swordsman Core'
                ? { 'Slash Damage': '20%' }
                : {}
        }
    });
    const { statsValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
    const special = new SpecialAbilityManager();
    special.reset();
    const manager = new DpsManager({ specialAbilityManager: special });
    const steps = manager.recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });
    return { manager, steps };
}

describe('Assassin Core', () => {
    it('riconosce il core e configura il buff', () => {
        const context = makeContext({
            coreName: 'Assassin Core',
            weapon: makeWeapon()
        });

        expect(getCoreKey(context)).toBe('assassin');
        expect(getBurstCore(context)).toMatchObject({
            name: 'Assassin Core',
            damagePercent: 0,
            buffDamagePercent: 25,
            activeSeconds: 6,
            cycleSeconds: 30,
            energyCost: 50
        });
    });

    it('proporziona il buff al ciclo della burst', () => {
        const context = makeContext({
            coreName: 'Assassin Core',
            weapon: makeWeapon(),
            settings: { useBurst: true }
        });

        expect(getBurstCycleEffects(context).burstCycle).toBe(30);
        expect(getBurstHitsPerSecond(context)).toBe(0);

        const buff = getCoreBuffEffects(context);
        expect(buff.visible).toBe(true);
        expect(buff.enabled).toBe(true);
        expect(buff.uptime).toBeCloseTo(6 / 30, 10);
        expect(buff.damagePercent).toBeCloseTo(5, 10);
    });

    it('applica +5% medio al danno con useBurst', () => {
        const { steps } = run({
            coreName: 'Assassin Core',
            weapon: makeWeapon(),
            settings: { useBurst: true }
        });

        expect(steps.damageMultiplier.coreBuffDamagePercent).toBeCloseTo(5, 10);
        expect(steps.damageMultiplier.damage).toBeCloseTo(105, 10);
        expect(steps.criticalDamage.baseDamage).toBeCloseTo(105, 10);
    });

    it('non applica il buff con la burst spenta', () => {
        const { steps } = run({
            coreName: 'Assassin Core',
            weapon: makeWeapon()
        });

        expect(steps.damageMultiplier.coreBuffDamagePercent).toBe(0);
        expect(steps.damageMultiplier.damage).toBeCloseTo(100, 10);
    });
});

describe('Swordsman Core', () => {
    it('riconosce il core e configura la burst melee', () => {
        const context = makeContext({
            coreName: 'Swordsman Core',
            weapon: makeWeapon()
        });

        expect(getCoreKey(context)).toBe('swordsman');
        expect(getBurstCore(context)).toMatchObject({
            name: 'Swordsman Core',
            damagePercent: 200,
            activeSeconds: 10,
            hitInterval: 0.5,
            cycleSeconds: 30,
            energyCost: 50,
            requiresMelee: true
        });
    });

    it('calcola hit/s della burst solo con armi melee', () => {
        const melee = makeContext({
            coreName: 'Swordsman Core',
            weapon: makeWeapon({ weaponType: 'melee' }),
            settings: { useBurst: true }
        });
        const ranged = makeContext({
            coreName: 'Swordsman Core',
            weapon: makeWeapon({ weaponType: 'ranged' }),
            settings: { useBurst: true }
        });

        expect(getBurstHitsPerSecond(melee)).toBeCloseTo((10 / 0.5) / 30, 10);
        expect(getBurstHitsPerSecond(ranged)).toBe(0);
    });

    it('applica il passivo +20% Slash e i proc al 200%', () => {
        const { manager, steps } = run({
            coreName: 'Swordsman Core',
            weapon: makeWeapon(),
            settings: { useBurst: true }
        });

        // Slash Damage 100 × 1.20 = 120.
        expect(steps.damageModifiers.damage).toBeCloseTo(120, 10);

        // Proc: 120 × reverse(100%) × 200% = 240.
        // Hit/s medi: (10 / 0.5) / 30 = 0.6667.
        expect(steps.burst.burstDamagePerHit).toBeCloseTo(240, 10);
        expect(steps.burst.burstHitsPerSecond).toBeCloseTo((10 / 0.5) / 30, 10);
        expect(steps.burst.burstDps).toBeCloseTo(160, 10);

        // Attack DPS 120 / 0.6 = 200. Totale = 360.
        expect(steps.attackSpeed.dps).toBeCloseTo(200, 10);
        expect(manager.getDps()).toBeCloseTo(360, 10);
    });

    it('non fa danno burst con un\'arma non melee', () => {
        const { steps } = run({
            coreName: 'Swordsman Core',
            weapon: makeWeapon({ weaponType: 'ranged' }),
            settings: { useBurst: true }
        });

        expect(steps.burst.available).toBe(true);
        expect(steps.burst.enabled).toBe(false);
        expect(steps.burst.reason).toBe('Requires melee weapon');
        expect(steps.burst.burstDps).toBe(0);
    });
});
