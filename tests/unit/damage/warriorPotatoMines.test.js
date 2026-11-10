import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { getPotatoMinesEffects } from '../../../js/modules/classes/warrior.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function makeWarriorWeapon() {
    return {
        name: 'Test Sword',
        stats: {
            'Damage Type': 'Slash',
            'Default Attack': 100,
            'Weapon Type': 'melee',
            'Slash Damage': 100
        }
    };
}

function makeContext({ levels = {}, settings = {} } = {}) {
    return {
        weapon: makeWarriorWeapon(),
        build: {
            treeLevels: {
                warrior: new Map(
                    Object.entries(levels).filter(([, value]) => value > 0)
                )
            }
        },
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    };
}

function run({ levels = {}, settings = {}, special = null } = {}) {
    const build = makeBuild({
        weapon: makeWarriorWeapon(),
        currentClass: 'warrior'
    });
    build.treeLevels.warrior = new Map(
        Object.entries(levels).filter(([, value]) => value > 0)
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
        settings: makeSettings(settings)
    });

    return { manager, steps };
}

describe('Warrior — Potato Mines', () => {
    it('legge i valori dei nodi a 5/5', () => {
        const context = makeContext({ levels: { R1: 5, R1a: 5, R1b: 5 } });
        const effect = getPotatoMinesEffects(context, 1 / 0.6);

        expect(effect.spawnChancePercent).toBe(50);
        expect(effect.explosionDamagePercent).toBe(50);
        expect(effect.maxMines).toBe(3);
        expect(effect.rechargeSeconds).toBe(8);
        expect(effect.poisonDefenseReductionPercent).toBe(25);
        expect(effect.poisonDurationSeconds).toBe(10);
        expect(effect.hotPotatoPerStackPercent).toBe(35);
    });

    it('calcola spawn e cap di esplosioni', () => {
        const low = getPotatoMinesEffects(
            makeContext({
                levels: { R1: 5 },
                settings: { potatoMinesHitsPerSecond: 0.2 }
            }),
            1 / 0.6
        );
        const high = getPotatoMinesEffects(
            makeContext({
                levels: { R1: 5 },
                settings: { potatoMinesHitsPerSecond: 1 }
            }),
            1 / 0.6
        );

        expect(low.spawnAttemptsPerSecond).toBeCloseTo(0.1, 10);
        expect(low.explosionsPerSecond).toBeCloseTo(0.1, 10);
        expect(high.spawnAttemptsPerSecond).toBeCloseTo(0.5, 10);
        // Cap: 3 mine / 8s = 0.375 esplosioni/s.
        expect(high.explosionsPerSecond).toBeCloseTo(0.375, 10);
    });

    it('calcola Poisoned Potatoes e Hot Potato', () => {
        const effect = getPotatoMinesEffects(
            makeContext({
                levels: { R1: 5, R1a: 5, R1b: 5 },
                settings: { potatoMinesHitsPerSecond: 1 }
            }),
            1 / 0.6
        );

        // 0.375 esplosioni/s × 10s = 3.75 → uptime 100%.
        expect(effect.poisonUptime).toBe(1);
        expect(effect.averageDefenseReductionPercent).toBeCloseTo(25, 10);

        // 0.375 / 1.6667 = 22.5% → 35% × 22.5% = 7.875%.
        expect(effect.hotPotatoCoverage).toBeCloseTo(0.225, 10);
        expect(effect.hotPotatoDamagePercent).toBeCloseTo(7.875, 10);
    });

    it('produce DPS separato per Potato Mines', () => {
        const { manager, steps } = run({
            levels: { R1: 5, R1a: 5, R1b: 5 },
            settings: { potatoMinesHitsPerSecond: 1 }
        });

        // Hot Potato: +7.875% sul danno base.
        const baseDamage = 100 * (1 + 7.875 / 100);
        const expectedAttackDps = baseDamage / 0.6;
        const expectedMineDps = 0.375 * baseDamage * 0.5;

        expect(steps.warrior.damage).toBeCloseTo(baseDamage, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo(expectedAttackDps, 10);
        expect(steps.potatoMines.damagePerExplosion)
            .toBeCloseTo(baseDamage * 0.5, 10);
        expect(steps.potatoMines.dps).toBeCloseTo(expectedMineDps, 10);
        expect(manager.getDps()).toBeCloseTo(expectedAttackDps + expectedMineDps, 10);

        const parts = manager.getDpsParts().map(part => part.label);
        expect(parts).toContain('Potato Mines');
    });

    it('senza hit subiti non produce esplosioni', () => {
        const { steps } = run({
            levels: { R1: 5, R1a: 5, R1b: 5 }
        });

        expect(steps.potatoMines.explosionsPerSecond).toBe(0);
        expect(steps.potatoMines.dps).toBe(0);
        expect(steps.warrior.hotPotatoDamagePercent).toBe(0);
    });

    it('lo step Potato Mines è nascosto senza nodi', () => {
        const { manager, steps } = run();

        expect(steps.potatoMines.visible).toBe(false);
        expect(manager.getStepGroups().some(group => group.id === 'potatoMines'))
            .toBe(false);
    });

    it('Hot Potato si somma agli altri bonus Warrior', () => {
        const { steps } = run({
            levels: { R1: 5, R1b: 5, UL2: 5 },
            settings: { potatoMinesHitsPerSecond: 1 }
        });

        // Chained Strike 6% + Hot Potato 7.875% = 13.875%.
        expect(steps.warrior.hotPotatoDamagePercent).toBeCloseTo(7.875, 10);
        expect(steps.warrior.chainedStrikeDamagePercent).toBeCloseTo(6, 10);
        expect(steps.warrior.totalDamagePercent).toBeCloseTo(13.875, 10);
        expect(steps.warrior.damage).toBeCloseTo(113.875, 10);
    });
});
