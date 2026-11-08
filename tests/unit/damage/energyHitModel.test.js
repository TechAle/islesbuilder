import { describe, expect, it } from 'vitest';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { getCrystalCombustionEffects } from '../../../js/modules/classes/mage.js';
import { createDamageContext } from '../../../js/modules/damage/damagePipeline.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { makeArcaneWeapon, makeBuild, makeSettings } from '../../helpers/build.js';

function contextFor({ abilities = [], treeLevels = {}, settings = {} } = {}) {
    const special = new SpecialAbilityManager();
    special.reset();
    if (abilities.length > 0) {
        special.registerAbilities('Test Weapon', abilities);
    }

    const build = makeBuild({
        weapon: makeArcaneWeapon(),
        treeLevels
    });

    return createDamageContext({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 100 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings),
        specialAbilityManager: special
    });
}

describe('special attack cast rate', () => {
    it('caps casts by cooldown when energy is not limiting', () => {
        const context = contextFor({
            abilities: [{
                kind: 'ability',
                name: 'Cheap Strike',
                energy: 0,
                text: 'Deal 100% damage',
                key: 'Right click'
            }]
        });

        const { entries } = context.specialAbilityManager.getOnClickCastStats(context);
        expect(entries).toHaveLength(1);
        expect(entries[0].castsPerSecond).toBeCloseTo(1 / 1.6, 10);
    });

    it('caps casts by energy regen when energy is limiting', () => {
        const context = contextFor({
            abilities: [{
                kind: 'ability',
                name: 'Expensive Strike',
                energy: 100,
                text: 'Deal 100% damage',
                key: 'Right click'
            }]
        });

        const { entries } = context.specialAbilityManager.getOnClickCastStats(context);
        expect(entries).toHaveLength(1);
        expect(entries[0].castsPerSecond).toBeCloseTo(10 / 100, 10);
    });

    it('returns zero casts for disabled abilities', () => {
        const context = contextFor({
            abilities: [{
                kind: 'ability',
                name: 'Disabled Strike',
                energy: 10,
                text: 'Deal 100% damage',
                key: 'Right click'
            }],
            settings: { disabledSpecialAttacks: ['Disabled Strike-Test Weapon'] }
        });

        const { entries } = context.specialAbilityManager.getOnClickCastStats(context);
        expect(entries[0].enabled).toBe(false);
        expect(entries[0].castsPerSecond).toBe(0);
    });
});

describe('mage hit model', () => {
    it('does not count explosions without Crystal Combustion', () => {
        const context = contextFor({
            treeLevels: { R: 1, R1: 1, R1a: 3 }
        });
        const effects = getCrystalCombustionEffects(context);

        expect(effects.combustionPercent).toBe(0);
        expect(effects.explosionsPerSecond).toBe(0);
        expect(effects.maxExplosions).toBe(0);
        expect(effects.totalHitsPerSecond).toBeCloseTo(1 / 0.6, 10);
    });

    it('counts explosions when Crystal Combustion is active', () => {
        const context = contextFor({
            treeLevels: { R: 1, R1: 1, R1a: 3, R1b: 3 }
        });
        const effects = getCrystalCombustionEffects(context);

        expect(effects.combustionPercent).toBeGreaterThan(0);
        expect(effects.explosionsPerSecond).toBeGreaterThan(0);
        expect(effects.maxExplosions).toBeGreaterThan(0);
        expect(effects.totalHitsPerSecond).toBeGreaterThan(1 / 0.6);
    });

    it('produces no explosions without crystal nodes', () => {
        const context = contextFor();
        const effects = getCrystalCombustionEffects(context);

        expect(effects.crystalTypesActive).toBe(0);
        expect(effects.explosionsPerSecond).toBe(0);
        expect(effects.combustionPercent).toBe(0);
        expect(effects.totalHitsPerSecond).toBeCloseTo(1 / 0.6, 10);
    });

    it('does not diverge over repeated evaluations', () => {
        const context = contextFor({
            treeLevels: { R: 1, R1: 1, R1a: 5, R1b: 5, R2: 5, R2a: 3 }
        });

        let previous = getCrystalCombustionEffects(context);
        for (let i = 0; i < 10; i++) {
            const current = getCrystalCombustionEffects(context);
            expect(current.totalHitsPerSecond).toBeCloseTo(previous.totalHitsPerSecond, 10);
            expect(current.explosionsPerSecond).toBeCloseTo(previous.explosionsPerSecond, 10);
            previous = current;
        }
        expect(Number.isFinite(previous.totalHitsPerSecond)).toBe(true);
        expect(previous.totalHitsPerSecond).toBeLessThan(100);
    });
});
