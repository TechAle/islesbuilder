import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import {
    getBloodlustEffects,
    getChainedStrikeEffects,
    getRelentlessAssaultEffects,
    getWarriorNodeValue
} from '../../../js/modules/classes/warrior.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

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

function run({ levels = {}, settings = {} } = {}) {
    const build = makeBuild({
        weapon: makeWarriorWeapon(),
        currentClass: 'warrior'
    });
    build.treeLevels.warrior = new Map(
        Object.entries(levels).filter(([, level]) => level > 0)
    );

    const special = new SpecialAbilityManager();
    special.reset();
    const manager = new DpsManager({ specialAbilityManager: special });
    const steps = manager.recalculate({
        statsValues: {
            'Slash Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 0 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });

    return { build, manager, steps };
}

describe('Warrior — Relentless Assault', () => {
    it('Relentless Assault: legge il valore del nodo a 5/5', () => {
        const context = {
            build: {
                treeLevels: { warrior: new Map([['UL1', 5]]) }
            },
            skillTrees: CLASS_SKILL_TREES
        };

        expect(getWarriorNodeValue(context, 'UL1')).toBe(20);
    });

    it('converte kills/s in copertura del buff', () => {
        const context = {
            build: {
                treeLevels: { warrior: new Map([['UL1', 5]]) }
            },
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({ relentlessAssaultKillsPerSecond: 1 })
        };

        // Hit/s = 1 / 0.6 = 1.6667. Coverage = 1 / 1.6667 = 0.6.
        // Bonus medio = 20% × 0.6 = 12%.
        const effect = getRelentlessAssaultEffects(context, 1 / 0.6);
        expect(effect.coverage).toBeCloseTo(0.6, 10);
        expect(effect.damagePercent).toBeCloseTo(12, 10);
    });

    it('non supera il 100% di copertura', () => {
        const context = {
            build: {
                treeLevels: { warrior: new Map([['UL1', 5]]) }
            },
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({ relentlessAssaultKillsPerSecond: 10 })
        };

        const effect = getRelentlessAssaultEffects(context, 1 / 0.6);
        expect(effect.coverage).toBe(1);
        expect(effect.damagePercent).toBeCloseTo(20, 10);
    });

    it('applica il bonus al danno dopo Sharpshooter e prima dei critici', () => {
        const { steps } = run({
            levels: { UL1: 5 },
            settings: { relentlessAssaultKillsPerSecond: 2 }
        });

        // 2 kills/s ≥ 1.6667 hit/s → coverage 100% → +20%.
        expect(steps.warrior.relentlessAssaultDamagePercent).toBeCloseTo(20, 10);
        expect(steps.warrior.damage).toBeCloseTo(120, 10);
        expect(steps.criticalDamage.baseDamage).toBeCloseTo(120, 10);
        expect(steps.criticalDamage.damage).toBeCloseTo(120, 10);
        expect(steps.attackSpeed.damage).toBeCloseTo(120, 10);
    });

    it('non fa nulla con kills/s a 0', () => {
        const { steps } = run({ levels: { UL1: 5 } });

        expect(steps.warrior.relentlessAssaultDamagePercent).toBe(0);
        expect(steps.warrior.damage).toBeCloseTo(100, 10);
    });
});

describe('Warrior — Chained Strike', () => {
    it('Chained Strike: legge il valore del nodo a 5/5', () => {
        const context = {
            build: {
                treeLevels: { warrior: new Map([['UL2', 5]]) }
            },
            skillTrees: CLASS_SKILL_TREES
        };

        expect(getWarriorNodeValue(context, 'UL2')).toBe(30);
    });

    it('applica 1/5 del valore del nodo come danno medio', () => {
        const context = {
            build: {
                treeLevels: { warrior: new Map([['UL2', 5]]) }
            },
            skillTrees: CLASS_SKILL_TREES
        };

        // 30% ogni 5 hit → 30 / 5 = 6% di danno medio.
        const effect = getChainedStrikeEffects(context);
        expect(effect.damagePercent).toBeCloseTo(6, 10);
    });

    it('aumenta il danno della pipeline del 6% a 5/5', () => {
        const { steps } = run({ levels: { UL2: 5 } });

        expect(steps.warrior.chainedStrikeDamagePercent).toBeCloseTo(6, 10);
        expect(steps.warrior.damage).toBeCloseTo(106, 10);
        expect(steps.criticalDamage.baseDamage).toBeCloseTo(106, 10);
    });
});

function runSelected({ levels = {}, special = null, settings = {}, core = null } = {}) {
    const weapon = {
        name: 'Test Sword',
        stats: {
            'Damage Type': 'Slash',
            'Default Attack': 100,
            'Weapon Type': 'melee',
            'Slash Damage': 100
        }
    };
    const build = makeBuild({ weapon, currentClass: 'warrior', core });
    build.treeLevels.warrior = new Map(
        Object.entries(levels).filter(([, level]) => level > 0)
    );

    const specialManager = special ?? new SpecialAbilityManager();
    if (!special) specialManager.reset();
    const { statsValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
    const manager = new DpsManager({ specialAbilityManager: specialManager });
    const steps = manager.recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });

    return { build, manager, statsValues, steps };
}

describe('Warrior — Heavy Strikes / Heavy Techniques', () => {
    it('Heavy Strikes compare come Default Damage e aumenta solo i default attacks', () => {
        const { statsValues, steps } = runSelected({ levels: { DL1: 5 } });

        // 5/5 = 5% × 5 = +25% Default Damage.
        expect(statsValues['Default Damage']?.percent).toBeCloseTo(25, 10);
        expect(steps.attackSpeed.defaultDamagePercent).toBeCloseTo(25, 10);
        expect(steps.attackSpeed.damage).toBeCloseTo(100, 10);
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(100, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo((100 / 0.6) * 1.25, 10);
    });

    it('Heavy Techniques compare come Ability Damage e aumenta solo le abilità', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Test Sword', [{
            kind: 'ability',
            name: 'Test Strike',
            energy: 0,
            text: 'Deal 100% damage.',
            key: 'Right click'
        }]);

        const { statsValues, steps } = runSelected({
            levels: { DL2: 5 },
            special
        });

        // 5/5 = 4% × 5 = +20% Ability Damage.
        expect(statsValues['Ability Damage']?.percent).toBeCloseTo(20, 10);
        expect(steps.specialAttacks.abilityDamagePercent).toBeCloseTo(20, 10);
        expect(steps.specialAttacks.abilities[0].damagePerHit)
            .toBeCloseTo(120, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo(100 / 0.6, 10);
    });

    it('Heavy Strikes si somma a Ultimate Scream', () => {
        const { steps } = runSelected({
            levels: { DL1: 5, UR1: 5 },
            core: { name: 'Mage Core', stats: {} },
            settings: { useBurst: true }
        });

        // Heavy 25% + Scream medio (20 / 6)%.
        const expectedPercent = 25 + 20 / 6;
        expect(steps.attackSpeed.defaultDamagePercent).toBeCloseTo(25, 10);
        expect(steps.attackSpeed.ultimateScreamDamagePercent)
            .toBeCloseTo(20 / 6, 10);
        expect(steps.attackSpeed.dps)
            .toBeCloseTo((100 / 0.6) * (1 + expectedPercent / 100), 10);
    });

    it('Heavy Techniques si somma a Ultimate Vengance', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Test Sword', [{
            kind: 'ability',
            name: 'Test Strike',
            energy: 0,
            text: 'Deal 100% damage.',
            key: 'Right click'
        }]);

        const { steps } = runSelected({
            levels: { DL2: 5, UR2: 5 },
            core: { name: 'Mage Core', stats: {} },
            special,
            settings: { useBurst: true }
        });

        const expectedPercent = 20 + 20 / 6;
        expect(steps.specialAttacks.abilityDamagePercent).toBeCloseTo(20, 10);
        expect(steps.specialAttacks.abilities[0].damagePerHit)
            .toBeCloseTo(100 * (1 + expectedPercent / 100), 10);
    });
});

describe('Warrior — Bloodlust / Bloodthirsty', () => {
    function bloodlustContext({ levels, hitsPerSecond }) {
        return {
            build: {
                treeLevels: {
                    warrior: new Map(Object.entries(levels).filter(([, value]) => value > 0))
                }
            },
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({ bloodlustHitsPerSecond: hitsPerSecond })
        };
    }

    it('calcola stack medi e danno Bloodlust', () => {
        const effect = getBloodlustEffects(bloodlustContext({
            levels: { L1: 5 },
            hitsPerSecond: 1
        }));

        // 5/5: finestra 5.25s, 5% per stack, max 3.
        expect(effect.windowSeconds).toBeCloseTo(5.25, 10);
        expect(effect.dmgPerStackPercent).toBeCloseTo(5, 10);
        expect(effect.maxStacks).toBe(3);
        expect(effect.averageStacks).toBeCloseTo(3, 10);
        expect(effect.damagePercent).toBeCloseTo(15, 10);
    });

    it('scala con gli hit subiti al secondo', () => {
        const low = getBloodlustEffects(bloodlustContext({
            levels: { L1: 5 },
            hitsPerSecond: 0.1
        }));
        const high = getBloodlustEffects(bloodlustContext({
            levels: { L1: 5 },
            hitsPerSecond: 1
        }));

        expect(low.averageStacks).toBeCloseTo(0.525, 10);
        expect(low.damagePercent).toBeCloseTo(2.625, 10);
        expect(high.damagePercent).toBeGreaterThan(low.damagePercent);
    });

    it('Bloodlust Capacity aumenta il cap degli stack', () => {
        const effect = getBloodlustEffects(bloodlustContext({
            levels: { L1: 5, L1a: 5 },
            hitsPerSecond: 1
        }));

        expect(effect.maxStacks).toBe(8);
        expect(effect.averageStacks).toBeCloseTo(5.25, 10);
        expect(effect.damagePercent).toBeCloseTo(26.25, 10);
    });

    it('calcola Bloodthirsty alla scadenza di Bloodlust', () => {
        const effect = getBloodlustEffects(bloodlustContext({
            levels: { L1: 5, L1b: 5 },
            hitsPerSecond: 0.1
        }));

        const expectedExpiry = Math.exp(-0.1 * 5.25);
        const expectedBloodthirsty = expectedExpiry * 0.525 * 5;

        expect(effect.expiryChance).toBeCloseTo(expectedExpiry, 10);
        expect(effect.bloodthirstyDamagePercent)
            .toBeCloseTo(expectedBloodthirsty, 10);
        expect(effect.totalDamagePercent)
            .toBeCloseTo(effect.damagePercent + expectedBloodthirsty, 10);
    });

    it('senza hit subiti non dà bonus', () => {
        const effect = getBloodlustEffects(bloodlustContext({
            levels: { L1: 5, L1a: 5, L1b: 5 },
            hitsPerSecond: 0
        }));

        expect(effect.damagePercent).toBe(0);
        expect(effect.bloodthirstyDamagePercent).toBe(0);
        expect(effect.reason).toBe('No hits taken');
    });

    it('applica Bloodlust e Bloodthirsty nella pipeline warrior', () => {
        const { steps } = run({
            levels: { L1: 5, L1a: 5, L1b: 5 },
            settings: { bloodlustHitsPerSecond: 0.1 }
        });

        const bloodlust = getBloodlustEffects({
            build: {
                treeLevels: {
                    warrior: new Map([['L1', 5], ['L1a', 5], ['L1b', 5]])
                }
            },
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({ bloodlustHitsPerSecond: 0.1 })
        });

        expect(steps.warrior.bloodlustDamagePercent)
            .toBeCloseTo(bloodlust.damagePercent, 10);
        expect(steps.warrior.bloodthirstyDamagePercent)
            .toBeCloseTo(bloodlust.bloodthirstyDamagePercent, 10);
        expect(steps.warrior.totalDamagePercent)
            .toBeCloseTo(bloodlust.totalDamagePercent, 10);
        expect(steps.warrior.damage)
            .toBeCloseTo(100 * (1 + bloodlust.totalDamagePercent / 100), 10);
    });
});

describe('Warrior — interazioni', () => {
    it('somma Relentless Assault e Chained Strike sulla stessa base', () => {
        const { steps } = run({
            levels: { UL1: 5, UL2: 5 },
            settings: { relentlessAssaultKillsPerSecond: 2 }
        });

        // Relentless 20% + Chained 6% = 26%.
        expect(steps.warrior.totalDamagePercent).toBeCloseTo(26, 10);
        expect(steps.warrior.damage).toBeCloseTo(126, 10);
        expect(steps.criticalDamage.baseDamage).toBeCloseTo(126, 10);
    });

    it('lo step warrior è nascosto senza nodi warrior', () => {
        const { manager, steps } = run();

        expect(steps.warrior.visible).toBe(false);
        expect(manager.getStepGroups().some(group => group.id === 'warrior')).toBe(false);
    });

    it('mostra le righe dei due nodi quando sono attivi', () => {
        const { manager } = run({
            levels: { UL1: 5, UL2: 5 },
            settings: { relentlessAssaultKillsPerSecond: 1 }
        });
        const group = manager.getStepGroups().find(entry => entry.id === 'warrior');
        const labels = group.results.map(row => row.label);

        expect(labels).toContain('Relentless Assault');
        expect(labels).toContain('Relentless Damage');
        expect(labels).toContain('Chained Strike');
        expect(labels).toContain('Chained Strike Damage');
        expect(labels).toContain('Warrior Damage');
    });
});
