import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    ItemManager,
    DpsManager,
    getPassiveHitStats,
    CLASS_SKILL_TREES,
    onClick,
    passives,
    SPECIAL_ABILITY_OVERRIDES,
    specialAbilityManager,
    makeWorld,
    makeDamageBuild
} from '../../helpers/legacyRuntime.js';
import { ITEMS_API_FIXTURE } from '../../fixtures/items.js';

test('special abilities: parsing nome, danno, key e times', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click',
            note: 'Consumes 1 Spell Rune!'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null,
            note: null
        }
    ]);

    const whirlwind = onClick.find(entry => entry.name === 'Whirlwind-Tempest');
    const smite = passives.find(entry => entry.name === 'Smite-Tempest');

    assert.equal(onClick.length, 1);
    assert.equal(passives.length, 1);
    assert.equal(whirlwind.ability, 'Whirlwind');
    assert.equal(whirlwind.weapon, 'Tempest');
    assert.equal(whirlwind.key, 'rightClick');
    assert.equal(whirlwind.energy, 12);
    assert.equal(whirlwind.damage, 45);
    assert.equal(whirlwind.times, 3); // override
    assert.equal(whirlwind.cooldown, 1.6);
    assert.equal(smite.key, null);
    assert.equal(smite.damage, 150);
    assert.equal(smite.everyHits, 5); // override

    specialAbilityManager.reset();
});

test('special abilities: cooldown override', () => {
    specialAbilityManager.reset();

    SPECIAL_ABILITY_OVERRIDES['Test Strike-Test Weapon'] = { cooldown: 2.5 };
    specialAbilityManager.registerAbilities('Test Weapon', [
        {
            kind: 'ability',
            name: 'Test Strike',
            energy: 10,
            text: 'Deal 100% damage.',
            key: 'F'
        }
    ]);

    const ability = onClick.find(entry => entry.name === 'Test Strike-Test Weapon');
    assert.equal(ability.key, 'f');
    assert.equal(ability.cooldown, 2.5);

    delete SPECIAL_ABILITY_OVERRIDES['Test Strike-Test Weapon'];
    specialAbilityManager.reset();
});

test('special abilities: Royal Blowpipe fa un solo colpo al 200% con cooldown 0.9s', () => {
    specialAbilityManager.reset();

    const blowpipe = ITEMS_API_FIXTURE.weapons.find(item => item.name === 'Royal Blowpipe');
    assert.ok(blowpipe);
    specialAbilityManager.registerAbilities(blowpipe.name, blowpipe.gear.abilities);

    const chainStinger = onClick.find(entry => entry.name === 'Chain Stinger-Royal Blowpipe');
    assert.ok(chainStinger);
    assert.equal(chainStinger.damage, 200);
    assert.equal(chainStinger.times, 1);
    assert.equal(chainStinger.hitsPerUse, 1);
    assert.equal(chainStinger.cooldown, 0.9);

    specialAbilityManager.reset();
});

test('special abilities: Riftripper dà +20% danno con cooldown 3.8s', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Riftripper', [{
        kind: 'ability',
        name: 'Awoken Fissure',
        energy: 16,
        text: 'Shoot an arrow that will spawn a Void Rift on hit, increasing damage by 20%. Hitting a Rift will deal 250% damage to nearby enemies.',
        key: 'Right click'
    }]);

    const fissure = onClick.find(entry => entry.name === 'Awoken Fissure-Riftripper');
    assert.ok(fissure);
    assert.equal(fissure.damage, 250);
    assert.equal(fissure.cooldown, 3.8);
    assert.equal(fissure.damageTakenIncreasePercent, 20);
    assert.equal(fissure.requiresPriorHit, true);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'ranged',
        'Arcane Damage': 20
    });
    build.activeEquip.weapon.name = 'Riftripper';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.damageMultiplier.damageTakenIncreasePercent, 20);

    specialAbilityManager.reset();
});

test('special abilities: override per abilità senza danno', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Sporeheart Orb', [
        {
            kind: 'ability',
            name: 'Toxic Gas',
            energy: 20,
            text: 'Poison enemies around you, lowering their Defense by 25%.',
            key: 'Right click'
        }
    ]);

    const toxicGas = onClick.find(entry => entry.name === 'Toxic Gas-Sporeheart Orb');
    assert.equal(toxicGas.damage, 0);

    specialAbilityManager.reset();
});

test('special abilities: più onClick da oggetti diversi', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);
    specialAbilityManager.registerAbilities('Windstorm Greaves', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 35,
            text: 'Create a tornado, moving you forward and dealing 200 damage to enemies in its path.',
            key: 'F'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';
    build.activeEquip.feet = {
        name: 'Windstorm Greaves',
        stats: {},
        augments: ['', '', '']
    };

    const abilities = specialAbilityManager.getActiveOnClick({ build });
    assert.equal(abilities.length, 2);
    assert.deepEqual(
        abilities.map(ability => ability.name),
        ['Whirlwind-Tempest', 'Whirlwind-Windstorm Greaves']
    );
    assert.equal(abilities[1].key, 'f');

    specialAbilityManager.reset();
});

test('special attacks: cooldown override aumenta il cooldown effettivo', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: { abilityCooldownOverrides: { 'Whirlwind-Tempest': 3.2 } }
    });

    const whirlwind = steps.specialAttacks.abilities.find(
        ability => ability.name === 'Whirlwind-Tempest'
    );

    assert.ok(Math.abs(whirlwind.castsPerSecond - (1 / 3.2)) < 1e-9);
    assert.ok(Math.abs(whirlwind.dps - (47.6 * 0.45 * 3) * (1 / 3.2)) < 1e-9);

    specialAbilityManager.reset();
});

test('special attacks: includono energia e DPS della burst', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    }, 'Mage Core');
    build.activeEquip.weapon.name = 'Tempest';

    const manager = new DpsManager({ specialAbilityManager });
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Crit Chance': { flat: 0, percent: 12 }
        },
        skillValues: {},
        build,
        settings: { useBurst: true }
    });

    const whirlwind = steps.specialAttacks.abilities.find(
        ability => ability.name === 'Whirlwind-Tempest'
    );

    assert.ok(steps.burst.enabled);
    assert.ok(Math.abs(whirlwind.totalDps - (steps.burst.totalDps + whirlwind.dps)) < 1e-9);
    assert.ok(Math.abs(
        whirlwind.energyWithAttack - (steps.burst.energyPerSecond - whirlwind.energyPerSecond)
    ) < 1e-9);
    assert.ok(Math.abs(
        steps.attackSpeed.energyPerSecondAttackBurst - steps.burst.energyPerSecond
    ) < 1e-9);
    assert.ok(Math.abs(
        steps.attackSpeed.energyPerSecondAttackBurstSpecial
        - (steps.burst.energyPerSecond - whirlwind.energyPerSecond)
    ) < 1e-9);

    const specialGroup = manager.getStepGroups().find(group => group.id === 'specialAttacks');
    const specialLabels = specialGroup.results.map(row => row.label);
    assert.equal(specialLabels.includes('Energy per Second (Whirlwind + Normal Attack)'), false);
    assert.equal(specialLabels.includes('Sustain (Whirlwind + Normal Attack)'), false);

    specialAbilityManager.reset();
});

test('special attacks: possono essere disabilitate dalle impostazioni', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: { disabledSpecialAttacks: ['Whirlwind-Tempest'] }
    });

    const whirlwind = steps.specialAttacks.abilities.find(
        ability => ability.name === 'Whirlwind-Tempest'
    );

    assert.equal(whirlwind.enabled, false);
    assert.equal(whirlwind.dps, 0);
    assert.equal(whirlwind.energyPerSecond, 0);
    assert.equal(steps.specialAttacks.enabled, false);

    specialAbilityManager.reset();
});

test('burst: usa Average Damage con reverse del Default Attack', () => {
    specialAbilityManager.reset();

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    }, 'Mage Core');

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: {
            slowAttack: false,
            attackInterval: null,
            useBurst: true,
            griefUptime: 100,
            lastSorrowUptime: 100,
            focusStacks: 0,
            potentialChargeKills: 0,
            crystalExplosionOverride: false,
            crystalExplosionsPerSecond: 0
        }
    });

    assert.equal(steps.burst.reverseMultiplier, 100 / 85);
    assert.ok(Math.abs(steps.burst.burstDamagePerHit - (47.6 * 0.75)) < 1e-9);
    assert.ok(Math.abs(steps.burst.burstDps - (47.6 * 0.75 * (10 / 0.75) / 30)) < 1e-9);
});

test('passive Smite: danno e hit ogni 5 attacchi con reverse', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Crit Chance': { flat: 0, percent: 12 }
        },
        skillValues: {},
        build
    });

    const attacksPerSecond = 1 / 0.6;
    const averageDamage = (47.6 * 0.85) * (1 + 0.12 * 0.5);
    const expectedDps = (attacksPerSecond / 5) * (averageDamage * 100 / 85) * 1.5;

    assert.ok(Math.abs(steps.attackSpeed.passiveDps - expectedDps) < 1e-9);
    assert.ok(Math.abs(expectedDps - 25.228) < 1e-3);
    assert.ok(Math.abs(steps.attackSpeed.passiveHitsPerSecond - attacksPerSecond / 5) < 1e-9);
    assert.ok(Math.abs(steps.attackSpeed.dps - (averageDamage / 0.6 + expectedDps)) < 1e-9);

    const passiveHits = getPassiveHitStats({
        weapon: build.activeEquip.weapon,
        build,
        statsValues: { 'Crit Chance': { flat: 0, percent: 12 } },
        settings: {},
        specialAbilityManager
    });
    assert.ok(Math.abs(passiveHits.hitsPerSecond - attacksPerSecond / 5) < 1e-9);
    assert.ok(Math.abs(passiveHits.nonPassiveHitsPerSecond - attacksPerSecond) < 1e-9);
    assert.ok(Math.abs(passiveHits.totalHitsPerSecond - (attacksPerSecond + attacksPerSecond / 5)) < 1e-9);

    specialAbilityManager.reset();
});

test('smite: anche gli hit di Whirlwind aumentano i proc', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const withWhirlwind = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build
    });

    const withoutWhirlwind = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: { disabledSpecialAttacks: ['Whirlwind-Tempest'] }
    });

    const whirlwindHits = 1 / 1.6;
    const expectedSmiteHits = ((1 / 0.6) + whirlwindHits) / 5;

    assert.ok(withWhirlwind.attackSpeed.passiveDps > withoutWhirlwind.attackSpeed.passiveDps);
    assert.ok(Math.abs(withWhirlwind.attackSpeed.passiveHitsPerSecond - expectedSmiteHits) < 1e-9);

    specialAbilityManager.reset();
});

test('smite: burst e altri hit aumentano i proc', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    }, 'Mage Core');
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: { useBurst: true }
    });

    const attacksPerSecond = 1 / 0.6;
    assert.ok(steps.burst.enabled);
    assert.ok(steps.attackSpeed.passiveHitsPerSecond > attacksPerSecond / 5);

    specialAbilityManager.reset();
});

test('ability speciali: Toxic Gas aumenta il danno del 25%', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Sporeheart Orb', [
        {
            kind: 'ability',
            name: 'Toxic Gas',
            energy: 20,
            text: 'Poison enemies around you, lowering their Defense by 25%.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Aura',
        'Default Attack': 60,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Sporeheart Orb';

    const statsValues = { 'Aura Damage': { flat: 33.1, percent: 0 } };
    const enabled = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build
    });
    const disabled = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { disabledSpecialAttacks: ['Toxic Gas-Sporeheart Orb'] }
    });

    assert.ok(Math.abs(enabled.damageMultiplier.damage - disabled.damageMultiplier.damage * 1.25) < 1e-9);

    specialAbilityManager.reset();
});

test('ability speciali: Astro Break può scegliere tra 150% e 300%', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Astralweaver', [
        {
            kind: 'ability',
            name: 'Astro Break',
            energy: 16,
            text: 'Fire an orb of dark matter, slowly growing and dealing 150-300% damage based on its size.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Astralweaver';

    const statsValues = { 'Arcane Damage': { flat: 40.7, percent: 0 } };
    const at150 = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { abilityDamageOverrides: { 'Astro Break-Astralweaver': 150 } }
    });
    const at300 = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { abilityDamageOverrides: { 'Astro Break-Astralweaver': 300 } }
    });

    const a150 = at150.specialAttacks.abilities[0];
    const a300 = at300.specialAttacks.abilities[0];
    assert.equal(a150.damagePercent, 150);
    assert.equal(a300.damagePercent, 300);
    assert.ok(Math.abs(a300.dps - a150.dps * 2) < 1e-9);

    specialAbilityManager.reset();
});

test('ability speciali: Bug Vitality usa il numero di hit scelto', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Glowbug Staff', [
        {
            kind: 'ability',
            name: 'Bug Vitality',
            energy: 12,
            text: 'Spawn a bug that homes towards the target, dealing 75% damage and heals you for 1% Health every hit. Can hit multiple times.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 150,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Glowbug Staff';

    const statsValues = { 'Arcane Damage': { flat: 35.3, percent: 0 } };
    const one = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { abilityHitCountOverrides: { 'Bug Vitality-Glowbug Staff': 1 } }
    });
    const five = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { abilityHitCountOverrides: { 'Bug Vitality-Glowbug Staff': 5 } }
    });

    const oneHit = one.specialAttacks.abilities[0];
    const fiveHits = five.specialAttacks.abilities[0];
    assert.equal(oneHit.times, 1);
    assert.equal(fiveHits.times, 5);
    assert.equal(fiveHits.hitsPerUse, 5);
    assert.ok(Math.abs(fiveHits.damagePerUse - oneHit.damagePerUse * 5) < 1e-9);

    specialAbilityManager.reset();
});

test('ability speciali: Death Ledger fa 28 hit ogni 14s', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Voras Deathnote', [
        {
            kind: 'ability',
            name: 'Death Ledger',
            energy: 40,
            text: 'The note will target nearby enemies, dealing 30% damage every 0.5s.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Illusion',
        'Default Attack': 120,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Voras Deathnote';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Illusion Damage': { flat: 41.3, percent: 0 } },
        skillValues: {},
        build
    });

    const deathLedger = steps.specialAttacks.abilities[0];
    assert.equal(deathLedger.cooldown, 14);
    assert.equal(deathLedger.times, 28);
    assert.equal(deathLedger.hitsPerUse, 28);
    assert.ok(Math.abs(deathLedger.hitsPerSecond - 2) < 1e-9);

    specialAbilityManager.reset();
});

test('ability speciali: Runic Knuckles aggiunge 1 hit per swing', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Runic Putrifists', [
        {
            kind: 'ability',
            name: 'Runic Knuckles',
            energy: 30,
            text: 'Spawn a portal that will throw fists whenever you swing, for 4s.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Aura',
        'Default Attack': 60,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Runic Putrifists';

    const statsValues = { 'Aura Damage': { flat: 35.3, percent: 0 } };
    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build
    });

    const runic = steps.specialAttacks.abilities[0];
    assert.equal(runic.cooldown, 4);
    assert.ok(Math.abs(runic.extraHitsPerSecond - (1 / 0.6)) < 1e-9);
    assert.ok(runic.hitsPerSecond >= 1 / 0.6);
    assert.ok(runic.dps > 0);

    const slowSteps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { slowAttack: true, attackInterval: 0.3 }
    });
    const slowRunic = slowSteps.specialAttacks.abilities[0];
    assert.ok(Math.abs(slowRunic.extraHitsPerSecond - (1 / 0.3)) < 1e-9);

    specialAbilityManager.reset();
});

test('ability costs: riducono il costo energetico delle special attack', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Ability Costs': { flat: 0, percent: -50 }
        },
        skillValues: {},
        build
    });

    const whirlwind = steps.specialAttacks.abilities[0];
    assert.equal(whirlwind.energyCost, 6);
    assert.ok(Math.abs(whirlwind.energyPerSecond - 3.75) < 1e-9);

    specialAbilityManager.reset();
});

test('damage breakdown: le fonti sommano correttamente', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';
    build.currentClass = 'mage';
    build.treeLevels = { mage: new Map([['L2', 5]]) };

    const manager = new DpsManager({ specialAbilityManager });
    manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Crit Chance': { flat: 0, percent: 12 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    const breakdown = manager.getDamageBreakdown();
    const sourcesTotal = breakdown.sources.reduce((sum, source) => sum + source.dps, 0);
    assert.ok(Math.abs(sourcesTotal - breakdown.total) < 1e-9);
    assert.ok(Math.abs(
        breakdown.sources.reduce((sum, source) => sum + source.percent, 0) - 100
    ) < 1e-9);

    assert.deepEqual(
        breakdown.sources.map(source => source.label).sort(),
        ['Attack', 'Smite-Tempest', 'Whirlwind']
    );
    assert.equal(breakdown.modifiers, undefined);

    specialAbilityManager.reset();
});

test('royal praise: Ability 2 registrata dall override e applica i suoi effetti', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilitiesFromStats('Royal Tiara', {
        'Ability 2': 'Royal Praise'
    });

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.activeEquip.weapon.stats.element = 'nature';
    build.activeEquip.helmet = { name: 'Royal Tiara', stats: {}, augments: ['', '', ''] };

    const context = {
        build,
        skillTrees: CLASS_SKILL_TREES,
        statsValues: {},
        settings: {}
    };

    assert.equal(
        specialAbilityManager.getAbilityElementalPowerPercent(context),
        25
    );
    assert.equal(
        specialAbilityManager.getElementalResistancePercent(context, 'nature'),
        -20
    );
    assert.equal(
        specialAbilityManager.getElementalResistancePercent(context, 'thunder'),
        0
    );

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Nature Damage': { flat: 0, percent: 5 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.ok(Math.abs(steps.damageModifiers.abilityElementalPowerPercent - 25) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.elementalResistancePercent + 20) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.elementalPower - 125) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.damage - 131.25) < 1e-9);

    specialAbilityManager.reset();
});

test('soil infestation: 25% danno subito in piu e nessun danno diretto', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Gloomfang Mace', [
        {
            kind: 'ability',
            name: 'Soil Infestation',
            energy: 20,
            text: 'Infest the area around you, making nearby enemies take 25% more damage.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Gloomfang Mace';

    const context = { build, statsValues: {}, settings: {} };
    assert.equal(specialAbilityManager.getDamageTakenIncreasePercent(context), 25);

    const entries = specialAbilityManager.getOnClickCastStats(context).entries;
    assert.equal(entries[0].damage, 0);

    const manager = new DpsManager({ specialAbilityManager });
    manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });
    const multiplierRows = manager.getStepGroups()
        .find(group => group.id === 'damageMultiplier').results
        .map(row => row.label);
    assert.ok(multiplierRows.includes('Damage%'));

    specialAbilityManager.reset();
});

test('cambio oggetto: non corrompe le definizioni delle abilità', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';
    build.activeEquip.weapon.stats['Ability 1'] = 'Whirlwind';
    build.activeEquip.weapon.stats['Ability 2'] = 'Smite';

    const context = { build, statsValues: {}, settings: {} };
    assert.equal(specialAbilityManager.getActiveOnClick(context).length, 1);
    assert.equal(specialAbilityManager.getActivePassives(context).length, 1);

    const whirlwind = onClick.find(entry => entry.name === 'Whirlwind-Tempest');
    const smite = passives.find(entry => entry.name === 'Smite-Tempest');

    assert.equal(whirlwind.damage, 45);
    assert.equal(whirlwind.energy, 12);
    assert.equal(whirlwind.times, 3);
    assert.equal(smite.damage, 150);
    assert.equal(smite.everyHits, 5);
    assert.ok(!onClick.some(entry => entry.name === 'Smite-Tempest'));

    specialAbilityManager.reset();
});

test('modale oggetto: rimuovere o rinominare Ability aggiorna le abilità attive', () => {
    const { dataStore, equippedStore } = makeWorld();
    const itemManager = new ItemManager({ dataStore, equippedStore });

    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Test Blade', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    equippedStore.setEquipSlot('weapon', {
        name: 'Test Blade',
        stats: {
            'Ability 1': 'Whirlwind',
            'Ability 2': 'Smite'
        },
        augments: ['', '', '']
    });

    const context = () => ({ build: equippedStore.state, statsValues: {}, settings: {} });

    assert.deepEqual(
        specialAbilityManager.getActiveOnClick(context()).map(a => a.ability),
        ['Whirlwind']
    );
    assert.deepEqual(
        specialAbilityManager.getActivePassives(context()).map(a => a.ability),
        ['Smite']
    );

    // Rimuove Ability 2 dal modale.
    itemManager.saveCustomItem('weapon', 'Test Blade', [
        { name: 'Ability 1', value: 'Whirlwind' }
    ]);

    assert.equal(equippedStore.state.activeEquip.weapon.abilitiesEdited, true);
    assert.deepEqual(
        specialAbilityManager.getActiveOnClick(context()).map(a => a.ability),
        ['Whirlwind']
    );
    assert.deepEqual(specialAbilityManager.getActivePassives(context()), []);

    // Rinomina Ability 1 in Smite: Whirlwind sparisce, Smite diventa passiva.
    itemManager.saveCustomItem('weapon', 'Test Blade', [
        { name: 'Ability 1', value: 'Smite' }
    ]);

    assert.deepEqual(specialAbilityManager.getActiveOnClick(context()), []);
    assert.deepEqual(
        specialAbilityManager.getActivePassives(context()).map(a => a.ability),
        ['Smite']
    );

    specialAbilityManager.reset();
});
