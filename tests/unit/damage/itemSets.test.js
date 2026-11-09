import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { getItemSetEffects } from '../../../js/modules/itemSets.js';
import { makeArcaneWeapon, makeBuild, makeSettings } from '../../helpers/build.js';

const AETHERBLOOM_SLOTS = ['helmet', 'chestplate', 'leggings', 'boots'];
const AETHERBLOOM_NAMES = {
    helmet: 'Aetherbloom Helmet',
    chestplate: 'Aetherbloom Chestplate',
    leggings: 'Aetherbloom Leggings',
    boots: 'Aetherbloom Boots'
};

function buildWithPieces(pieces = []) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: makeArcaneWeapon()
    });
    AETHERBLOOM_SLOTS.forEach(slot => {
        build.activeEquip[slot] = {
            ...build.activeEquip[slot],
            name: pieces.includes(slot) ? AETHERBLOOM_NAMES[slot] : '',
            stats: {}
        };
    });
    return build;
}

function contextFor(pieces, settings = {}) {
    return {
        build: buildWithPieces(pieces),
        settings: makeSettings(settings),
        statsValues: {},
        skillTrees: CLASS_SKILL_TREES
    };
}

function run(pieces, settings = {}, statsValues = {}) {
    const build = buildWithPieces(pieces);
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });
    return { manager, steps, build };
}

describe('Aetherbloom set', () => {
    it('does nothing without Aetherbloom pieces', () => {
        const effects = getItemSetEffects(contextFor([]));

        expect(effects.aetherbloomPieces).toBe(0);
        expect(effects.hasExecution).toBe(false);
        expect(effects.hasAlliance).toBe(false);
        expect(effects.executionPercent).toBe(0);
        expect(effects.allianceCritChancePercent).toBe(0);
    });

    it('actives Execution once with a single piece', () => {
        const effects = getItemSetEffects(contextFor(['chestplate'], {
            executionHpPercent: 50
        }));

        expect(effects.aetherbloomPieces).toBe(1);
        expect(effects.hasExecution).toBe(true);
        expect(effects.executionPercent).toBe(5);
        expect(effects.hasAlliance).toBe(false);
    });

    it('Execution does not stack with multiple pieces', () => {
        const onePiece = getItemSetEffects(contextFor(['chestplate'], {
            executionHpPercent: 0
        }));
        const fullHp = getItemSetEffects(contextFor(['chestplate'], {
            executionHpPercent: 100
        }));
        const fourPieces = getItemSetEffects(contextFor(AETHERBLOOM_SLOTS, {
            executionHpPercent: 0
        }));

        expect(onePiece.executionPercent).toBe(10);
        expect(fullHp.executionPercent).toBe(0);
        expect(fourPieces.executionPercent).toBe(10);
    });

    it('Alliance requires all four pieces and caps at 6 players', () => {
        const threePieces = getItemSetEffects(contextFor([
            'helmet', 'chestplate', 'leggings'
        ], {
            nearbyPlayers: 6
        }));
        const fullSet = getItemSetEffects(contextFor(AETHERBLOOM_SLOTS, {
            nearbyPlayers: 4
        }));
        const capped = getItemSetEffects(contextFor(AETHERBLOOM_SLOTS, {
            nearbyPlayers: 99
        }));

        expect(threePieces.hasAlliance).toBe(false);
        expect(threePieces.allianceCritChancePercent).toBe(0);

        expect(fullSet.hasAlliance).toBe(true);
        expect(fullSet.allianceCritChancePercent).toBe(12);

        expect(capped.nearbyPlayers).toBe(6);
        expect(capped.allianceCritChancePercent).toBe(18);
    });

    it('adds Alliance Crit Chance to the shared Crit Chance', () => {
        const { steps } = run(AETHERBLOOM_SLOTS, {
            nearbyPlayers: 3
        }, {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 10 }
        });

        expect(steps.criticalDamage.itemSets.hasAlliance).toBe(true);
        expect(steps.criticalDamage.itemSets.allianceCritChancePercent).toBe(9);
        expect(steps.criticalDamage.critChance).toBeCloseTo(19, 10);
    });

    it('applies Aetherbloom Execution in the final damage step', () => {
        const { manager, steps } = run(['chestplate'], {
            executionHpPercent: 50
        }, {
            'Arcane Damage': { flat: 100, percent: 0 }
        });

        expect(steps.augmentFinal.hasSetExecution).toBe(true);
        expect(steps.augmentFinal.setExecutionPercent).toBeCloseTo(5, 10);
        expect(steps.augmentFinal.augmentPercent).toBeCloseTo(5, 10);
        expect(steps.augmentFinal.damage).toBeCloseTo(105, 10);

        const rows = manager.getStepGroups()
            .find(group => group.id === 'damageMultiplier')
            .results;
        expect(rows.some(row => row.label === 'Aetherbloom Execution')).toBe(true);
    });
});
