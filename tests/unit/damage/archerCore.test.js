import { describe, expect, it } from 'vitest';
import { ITEM_DATABASE } from '../../../js/data/items.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { getBurstCycleEffects, getBurstHitsPerSecond } from '../../../js/modules/classes/mage.js';
import { getBurstCore, hasArcherCore, hasBurstCore } from '../../../js/modules/classes/core.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

const BURST_HITS_PER_SECOND = (10 / 0.75) / 30;

function makePierceWeapon() {
    return {
        name: 'Test Bow',
        stats: {
            'Damage Type': 'Pierce',
            // Default Attack volutamente diverso da 100% per verificare il
            // reverse multiplier usato anche dal Mage Core.
            'Default Attack': 85,
            'Weapon Type': 'ranged'
        }
    };
}

function run({ core = null, useBurst = true, settings = {}, treeLevels = {} } = {}) {
    const special = new SpecialAbilityManager();
    special.reset();
    const build = makeBuild({
        weapon: makePierceWeapon(),
        core,
        currentClass: 'archer'
    });
    build.treeLevels.archer = new Map(
        Object.entries(treeLevels).filter(([, level]) => level > 0)
    );

    const manager = new DpsManager({ specialAbilityManager: special });
    const steps = manager.recalculate({
        statsValues: {
            // Il 20% Pierce Damage è il bonus passivo dell'Archer Core.
            'Pierce Damage': { flat: 100, percent: 20 },
            'Crit Chance': { flat: 0, percent: 0 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings({ useBurst, ...settings })
    });

    return { build, manager, steps };
}

describe('Archer Core', () => {
    it('ha il 20% Pierce Damage nel database oggetti', () => {
        const core = ITEM_DATABASE.core.find(item => item.name === 'Archer Core');
        expect(core).toBeTruthy();
        expect(core.stats['Pierce Damage']).toBe('20%');
    });

    it('riconosce Archer Core e Mage Core come core con burst', () => {
        const archer = { build: { activeEquip: { core: { name: 'Archer Core' } } } };
        const mage = { build: { activeEquip: { core: { name: 'Mage Core' } } } };
        const assassin = { build: { activeEquip: { core: { name: 'Assassin Core' } } } };

        expect(hasArcherCore(archer)).toBe(true);
        expect(hasBurstCore(archer)).toBe(true);
        expect(getBurstCore(archer)).toMatchObject({
            key: 'archer',
            name: 'Archer Core',
            damagePercent: 66,
            energyCost: 50
        });

        expect(hasArcherCore(mage)).toBe(false);
        expect(hasBurstCore(mage)).toBe(true);
        expect(getBurstCore(mage)).toMatchObject({
            key: 'mage',
            name: 'Mage Core',
            damagePercent: 75,
            energyCost: 50
        });

        expect(hasArcherCore(assassin)).toBe(false);
        expect(hasBurstCore(assassin)).toBe(false);
        expect(getBurstCore(assassin)).toBe(null);
    });

    it('infligge il 66% del danno per freccia con un ciclo fisso di 30s', () => {
        const { steps } = run({
            core: { name: 'Archer Core', stats: {} }
        });

        // Danno dopo il critico: 100 Pierce × 85% Default Attack × 1.2 = 102.
        // Freccia: 102 × reverse(85%) × 66% = 79.2.
        const reverse = 100 / 85;
        const expectedArrow = steps.criticalDamage.damage * reverse * 0.66;

        expect(steps.criticalDamage.damage).toBeCloseTo(102, 10);
        expect(steps.burst.reverseMultiplier).toBeCloseTo(reverse, 10);
        expect(steps.burst.available).toBe(true);
        expect(steps.burst.enabled).toBe(true);
        expect(steps.burst.coreName).toBe('Archer Core');
        expect(steps.burst.burstDamagePerHit).toBeCloseTo(expectedArrow, 10);
        expect(steps.burst.burstCycle).toBe(30);
        expect(steps.burst.burstCastsPerSecond).toBeCloseTo(1 / 30, 10);
        expect(steps.burst.burstEnergyPerSecond).toBeCloseTo(50 / 30, 10);
        expect(steps.burst.energyPerSecondBurstOnly).toBeCloseTo(-50 / 30, 10);
        expect(steps.burst.burstDps).toBeCloseTo(expectedArrow * BURST_HITS_PER_SECOND, 10);
        expect(steps.burst.secondWindResetsPerSecond).toBe(0);
    });

    it('usa lo stesso danno di base del Mage Core, cambiando solo 75% in 66%', () => {
        const archer = run({ core: { name: 'Archer Core', stats: {} } });
        const mage = run({ core: { name: 'Mage Core', stats: {} } });
        const reverse = 100 / 85;
        const base = archer.steps.criticalDamage.damage;

        expect(archer.steps.burst.burstDamagePerHit)
            .toBeCloseTo(base * reverse * 0.66, 10);
        expect(mage.steps.burst.burstDamagePerHit)
            .toBeCloseTo(base * reverse * 0.75, 10);
        expect(archer.steps.burst.burstDamagePerHit
            / mage.steps.burst.burstDamagePerHit).toBeCloseTo(66 / 75, 10);
    });

    it('mostra le righe Burst / Arrow e il costo energetico', () => {
        const { manager, steps } = run({
            core: { name: 'Archer Core', stats: {} }
        });
        const group = manager.getStepGroups().find(entry => entry.id === 'burst');
        const labels = group.results.map(row => row.label);

        expect(labels).toContain('Burst / Arrow');
        expect(labels).toContain('Burst DPS');
        expect(labels).toContain('Energy per Second');
        expect(manager.getDpsParts().some(part => part.label === 'Burst')).toBe(true);

        const energyRow = group.results.find(row => row.label === 'Energy per Second');
        expect(energyRow.value).toBeCloseTo(steps.burst.energyPerSecondBurstOnly, 10);
    });

    it('non applica Potential Charge né Second Wind all\'Archer Core', () => {
        const context = {
            build: {
                activeEquip: { core: { name: 'Archer Core', stats: {} } },
                treeLevels: {
                    mage: new Map([['UR1', 5]]),
                    archer: new Map()
                }
            },
            skillTrees: CLASS_SKILL_TREES,
            settings: {
                useBurst: true,
                potentialChargeKills: 30,
                ultimateKillsPerSecond: 4
            }
        };

        const cycle = getBurstCycleEffects(context);
        expect(cycle.cooldownReduction).toBe(0);
        expect(cycle.burstCycle).toBe(30);
        expect(cycle.secondWindResetsPerSecond).toBe(0);
        expect(cycle.hasSecondWind).toBe(false);
    });

    it('conta le frecce come hit nel modello di combattimento', () => {
        const { build } = run({ core: { name: 'Archer Core', stats: {} } });
        const context = {
            build,
            settings: { useBurst: true }
        };

        expect(getBurstHitsPerSecond(context)).toBeCloseTo(BURST_HITS_PER_SECOND, 10);

        context.settings.useBurst = false;
        expect(getBurstHitsPerSecond(context)).toBe(0);
    });

    it('attiva l\'Ultimate arciere anche con l\'Archer Core', () => {
        const { steps } = run({
            core: { name: 'Archer Core', stats: {} },
            treeLevels: { UR1: 5, UR2: 5 }
        });
        const ultimate = steps.criticalDamage.ultimate;

        expect(ultimate.visible).toBe(true);
        expect(ultimate.enabled).toBe(true);
        expect(ultimate.burstCycle).toBe(30);
        expect(ultimate.uptime).toBeCloseTo(5 / 30, 10);
        expect(ultimate.critChancePercent).toBeCloseTo(10 / 6, 10);
        expect(ultimate.critDamagePercent).toBeCloseTo(20 / 6, 10);
    });
});
