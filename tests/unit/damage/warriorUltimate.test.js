import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { getWarriorUltimateEffects } from '../../../js/modules/classes/warrior.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

const MAGE_CORE = { name: 'Mage Core', stats: {} };

function makeWarriorWeapon() {
    return {
        name: 'Test Sword',
        stats: {
            'Damage Type': 'Slash',
            'Default Attack': 100,
            'Weapon Type': 'melee'
        }
    };
}

function makeContext({ levels = {}, mageLevels = {}, core = MAGE_CORE, settings = {} } = {}) {
    const weapon = makeWarriorWeapon();
    const build = makeBuild({
        weapon,
        core,
        currentClass: 'warrior'
    });
    build.treeLevels.warrior = new Map(
        Object.entries(levels).filter(([, value]) => value > 0)
    );
    build.treeLevels.mage = new Map(
        Object.entries(mageLevels).filter(([, value]) => value > 0)
    );

    return {
        weapon,
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings({ useBurst: true, ...settings })
    };
}

function runPipeline({
    levels = {},
    mageLevels = {},
    core = MAGE_CORE,
    settings = {},
    special = null
} = {}) {
    const weapon = makeWarriorWeapon();
    const build = makeBuild({
        weapon,
        core,
        currentClass: 'warrior'
    });
    build.treeLevels.warrior = new Map(
        Object.entries(levels).filter(([, value]) => value > 0)
    );
    build.treeLevels.mage = new Map(
        Object.entries(mageLevels).filter(([, value]) => value > 0)
    );

    const specialManager = special ?? new SpecialAbilityManager();
    if (!special) specialManager.reset();
    const manager = new DpsManager({ specialAbilityManager: specialManager });
    const steps = manager.recalculate({
        statsValues: {
            'Slash Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 0 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings({ useBurst: true, ...settings })
    });

    return { manager, steps };
}

describe('Warrior — Ultimate Scream / Vengance', () => {
    it('proporziona il buff all\'uptime della burst (30s)', () => {
        const effect = getWarriorUltimateEffects(makeContext({
            levels: { UR1: 5, UR2: 5 }
        }));

        expect(effect.enabled).toBe(true);
        expect(effect.burstCycle).toBe(30);
        expect(effect.uptime).toBeCloseTo(5 / 30, 10);
        expect(effect.screamDamagePercent).toBeCloseTo(20 / 6, 10);
        expect(effect.venganceDamagePercent).toBeCloseTo(20 / 6, 10);
    });

    it('usa il ciclo ridotto da Potential Charge', () => {
        const effect = getWarriorUltimateEffects(makeContext({
            levels: { UR1: 5, UR2: 5 },
            mageLevels: { UR1: 5 },
            settings: { potentialChargeKills: 30 }
        }));

        expect(effect.burstCycle).toBe(10);
        expect(effect.uptime).toBeCloseTo(0.5, 10);
        expect(effect.screamDamagePercent).toBeCloseTo(10, 10);
        expect(effect.venganceDamagePercent).toBeCloseTo(10, 10);
    });

    it('non è attivo senza burst o con burst spenta', () => {
        const noCore = getWarriorUltimateEffects(makeContext({
            levels: { UR1: 5 },
            core: null
        }));
        expect(noCore.enabled).toBe(false);
        expect(noCore.reason).toBe('Requires burst core');
        expect(noCore.screamDamagePercent).toBe(0);

        const burstOff = getWarriorUltimateEffects(makeContext({
            levels: { UR1: 5 },
            settings: { useBurst: false }
        }));
        expect(burstOff.enabled).toBe(false);
        expect(burstOff.reason).toBe('Burst disabled');
        expect(burstOff.screamDamagePercent).toBe(0);
    });

    it('Ultimate Scream aumenta solo il DPS dei default attacks', () => {
        const { steps } = runPipeline({ levels: { UR1: 5 } });
        const expectedAttackDps = (100 / 0.6) * (1 + (20 / 6) / 100);

        expect(steps.attackSpeed.damage).toBeCloseTo(100, 10);
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(100, 10);
        expect(steps.attackSpeed.ultimateScreamDamagePercent).toBeCloseTo(20 / 6, 10);
        expect(steps.attackSpeed.ultimateUptime).toBeCloseTo(5 / 30, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo(expectedAttackDps, 10);
    });

    it('Ultimate Vengance aumenta solo le weapon abilities', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Test Sword', [{
            kind: 'ability',
            name: 'Test Strike',
            energy: 0,
            text: 'Deal 100% damage.',
            key: 'Right click'
        }]);

        const withVengance = runPipeline({ levels: { UR2: 5 }, special });
        const withoutVengance = runPipeline({ levels: {}, special });

        const boosted = withVengance.steps.specialAttacks.abilities[0];
        const base = withoutVengance.steps.specialAttacks.abilities[0];

        expect(base.damagePerHit).toBeCloseTo(100, 10);
        expect(boosted.damagePerHit).toBeCloseTo(100 * (1 + (20 / 6) / 100), 10);
        expect(boosted.dps).toBeCloseTo(base.dps * (1 + (20 / 6) / 100), 10);
        expect(withVengance.steps.specialAttacks.ultimateVenganceDamagePercent)
            .toBeCloseTo(20 / 6, 10);
    });

    it('Scream non tocca le abilità e Vengance non tocca il default attack', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Test Sword', [{
            kind: 'ability',
            name: 'Test Strike',
            energy: 0,
            text: 'Deal 100% damage.',
            key: 'Right click'
        }]);

        const screamOnly = runPipeline({ levels: { UR1: 5 }, special });
        const venganceOnly = runPipeline({ levels: { UR2: 5 }, special });

        expect(screamOnly.steps.specialAttacks.abilities[0].damagePerHit)
            .toBeCloseTo(100, 10);
        expect(venganceOnly.steps.attackSpeed.dps)
            .toBeCloseTo(100 / 0.6, 10);
    });
});
