import { beforeAll, describe, expect, it } from 'vitest';
import {
    registerAugments,
    parseAugment,
    getAugmentEffects,
    getAugmentStatBonuses,
    getEquippedAugments,
    getAugmentSuggestions
} from '../../../js/modules/augmentManager.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeArcaneWeapon, makeBuild, makeSettings } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function stepsFor(augments, settings = {}, weaponStats = {}) {
    const build = makeBuild({
        weapon: makeArcaneWeapon(weaponStats),
        augments
    });
    const steps = new DpsManager().recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 0 }
        },
        skillValues: {},
        build,
        settings: makeSettings(settings)
    });
    return { steps, build };
}

describe('augment metadata', () => {
    it('registers every usable augment with six levels', () => {
        const augments = [...new Map(
            AUGMENT_API_FIXTURE
                .map(raw => [raw.name, raw])
        ).values()];
        expect(augments.length).toBeGreaterThan(0);

        for (const raw of augments) {
            const parsed = parseAugment(`${raw.name} 6`);
            if (parsed) {
                expect(parsed.level.level, raw.name).toBe(6);
            }
        }

        expect(parseAugment('Hunter 6').level.value).toBe(75);
        expect(parseAugment('Prosecution 6').level.value).toBe(37.5);
        expect(parseAugment('Execution 6').level.value).toBe(60);
        expect(parseAugment('Enraged 6').level.value).toBe(65);
        expect(parseAugment('First Strike 6').level.value).toBe(60);
        expect(parseAugment('Arcane Damage 6').level.value).toBe(15);
        expect(parseAugment("Nature's Bless 6").level.value).toBe(20);
    });

    it('suggests only augments for the requested slot', () => {
        const weapon = getAugmentSuggestions('weapon');
        const armor = getAugmentSuggestions('armor');

        expect(weapon).toContain('Hunter 1');
        expect(weapon).toContain('Hunter 6');
        expect(weapon).not.toContain('Arcane Defense 1');
        expect(armor).toContain('Arcane Defense 1');
        expect(armor).not.toContain('Hunter 1');
    });

    it('only equips augments in their compatible slot', () => {
        const build = makeBuild({
            weapon: makeArcaneWeapon(),
            augments: ['Hunter 1', 'Arcane Defense 1']
        });
        build.activeEquip.helmet = {
            name: 'Helmet',
            stats: {},
            augments: ['Arcane Defense 1', ''],
            upgradeLevel: 0,
            abilitiesEdited: false
        };

        const equipped = getEquippedAugments(build);
        expect(equipped.map(entry => entry.augment.name)).toEqual(['Hunter', 'Arcane Defense']);
    });

    it('never reads more than the configured maximum augments', () => {
        const build = makeBuild({ weapon: makeArcaneWeapon() });
        build.activeEquip.weapon.augments = ['Hunter 1', 'Infected 1', 'Combo 1'];

        expect(getEquippedAugments(build)).toHaveLength(2);
    });
});

describe('duplicate augment rules', () => {
    it('does not stack two Infected', () => {
        const build = makeBuild({
            weapon: makeArcaneWeapon(),
            augments: ['Infected 6', 'Infected 6']
        });
        const effects = getAugmentEffects({ build, settings: makeSettings() });

        expect(effects.infected).toHaveLength(1);
        expect(effects.infected[0].perHit).toBe(3);
        expect(effects.infected[0].maxHits).toBe(15);
    });

    it('two Infected still produce only one Infected debuff', () => {
        const { steps } = stepsFor(['Infected 6', 'Infected 6'], {
            infectedHitsOverride: 10
        });

        expect(steps.augmentFinal.infectedPercent).toBe(30);
        expect(steps.augmentFinal.damage).toBe(130);
    });

    it("does not stack two Nature's Bless", () => {
        const build = makeBuild({
            weapon: makeArcaneWeapon(),
            augments: ["Nature's Bless 6", "Nature's Bless 6"]
        });
        const effects = getAugmentEffects({ build, settings: makeSettings() });
        const bonuses = getAugmentStatBonuses(build);

        expect(effects.natureBlessFlat).toBe(20);
        expect(bonuses.filter(bonus => bonus.stat === 'Elemental Power')).toEqual([
            { stat: 'Elemental Power', value: 20, percent: false }
        ]);
    });

    it('stacks two Hunter copies', () => {
        const { steps } = stepsFor(['Hunter 6', 'Hunter 6']);

        expect(steps.augmentFinal.hunterPercent).toBe(150);
        expect(steps.augmentFinal.damage).toBe(250);
    });

    it('stacks two Arcane Damage copies', () => {
        const { steps } = stepsFor(['Arcane Damage 6', 'Arcane Damage 6']);

        expect(steps.augmentFinal.damageStatPercent).toBe(30);
        expect(steps.augmentFinal.damage).toBe(130);
    });
});

describe('augment final step values', () => {
    it('Hunter applies its flat percentage', () => {
        const { steps } = stepsFor(['Hunter 6']);
        expect(steps.augmentFinal.hunterPercent).toBe(75);
        expect(steps.augmentFinal.damage).toBe(175);
    });

    it('Prosecution scales with enemy HP', () => {
        const full = stepsFor(['Prosecution 6'], { prosecutionHpPercent: 100 }).steps;
        const half = stepsFor(['Prosecution 6'], { prosecutionHpPercent: 50 }).steps;

        expect(full.augmentFinal.prosecutionPercent).toBe(37.5);
        expect(half.augmentFinal.prosecutionPercent).toBe(18.75);
    });

    it('Execution scales with missing enemy HP', () => {
        const dead = stepsFor(['Execution 6'], { executionHpPercent: 0 }).steps;
        const full = stepsFor(['Execution 6'], { executionHpPercent: 100 }).steps;

        expect(dead.augmentFinal.executionPercent).toBe(60);
        expect(full.augmentFinal.executionPercent).toBe(0);
    });

    it('Enraged is zero at full HP and maximum at zero HP', () => {
        const full = stepsFor(['Enraged 6'], { enragedHpPercent: 100 }).steps;
        const empty = stepsFor(['Enraged 6'], { enragedHpPercent: 0 }).steps;

        expect(full.augmentFinal.enragedPercent).toBe(0);
        expect(empty.augmentFinal.enragedPercent).toBe(65);
    });

    it('First Strike only applies to the first hit', () => {
        const normal = stepsFor(['First Strike 6']).steps;
        const first = stepsFor(['First Strike 6'], { firstHit: true }).steps;

        expect(normal.augmentFinal.firstStrikePercent).toBe(0);
        expect(first.augmentFinal.firstStrikePercent).toBe(60);
        expect(first.augmentFinal.damage).toBe(160);
    });

    it('Infected does not apply to the first hit', () => {
        const first = stepsFor(['Infected 6'], {
            firstHit: true,
            infectedHitsOverride: 10
        }).steps;

        expect(first.augmentFinal.infectedPercent).toBe(0);
        expect(first.augmentFinal.damage).toBe(100);
    });

    it('Arcane Damage only applies to an Arcane weapon', () => {
        const arcane = stepsFor(['Arcane Damage 6']).steps;
        const illusion = stepsFor(['Arcane Damage 6'], {}, {
            'Damage Type': 'Illusion',
            'Illusion Damage': 100
        }).steps;

        expect(arcane.augmentFinal.damageStatPercent).toBe(15);
        expect(illusion.augmentFinal.damageStatPercent).toBe(0);
    });
});

describe('augment damage steps', () => {
    it('Combo produces extra DPS', () => {
        const { steps } = stepsFor(['Combo 6']);
        expect(steps.augmentDamage.comboDps).toBeGreaterThan(0);
    });

    it('Chain Lightning produces extra DPS with crits', () => {
        const { steps } = stepsFor(['Chain Lightning 6'], {}, {});
        // crit chance 0 in the base helper, so set it explicitly via a second run
        const build = makeBuild({ weapon: makeArcaneWeapon(), augments: ['Chain Lightning 6'] });
        const withCrit = new DpsManager().recalculate({
            statsValues: {
                'Arcane Damage': { flat: 100, percent: 0 },
                'Crit Chance': { flat: 0, percent: 100 }
            },
            skillValues: {},
            build,
            settings: makeSettings()
        });
        expect(steps.augmentDamage.chainLightningDps).toBe(0);
        expect(withCrit.augmentDamage.chainLightningDps).toBeGreaterThan(0);
    });

    it('Deathburst produces extra DPS when kills happen', () => {
        const withKills = stepsFor(['Deathburst 6'], { deathburstKillsPerSecond: 0.2 }).steps;
        const noKills = stepsFor(['Deathburst 6'], { deathburstKillsPerSecond: 0 }).steps;

        expect(withKills.augmentDamage.deathburstDps).toBeGreaterThan(0);
        expect(noKills.augmentDamage.deathburstDps).toBe(0);
    });
});
