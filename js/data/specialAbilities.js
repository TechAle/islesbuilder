/**
 * Abilità speciali estratte dalle armi.
 *
 * Le voci sono popolate a runtime dal parser partendo dalle abilità dell'API.
 * Il nome di ogni voce è sempre `NomeAbilità-NomeArma`.
 *
 * @typedef {import('./types.js').SpecialAbility} SpecialAbility
 */

/**
 * Abilità attivabili con tasto destro o F.
 * @type {SpecialAbility[]}
 */
export const onClick = [];

/**
 * Passive permanenti dell'arma.
 * @type {SpecialAbility[]}
 */
export const passives = [];

/**
 * Override manuali per abilità/passive.
 * La chiave è il nome completo `NomeAbilità-NomeArma`.
 *
 * @type {Record<string, Partial<SpecialAbility>>}
 */
export const SPECIAL_ABILITY_OVERRIDES = {
    // Smite colpisce ogni 5 attacchi; il 150% viene letto dal testo.
    'Smite-Tempest': { everyHits: 5 },

    // Whirlwind evoca tre tornado, ognuno al 45%.
    'Whirlwind-Tempest': { times: 3 },

    // Tre direzioni, 60% ciascuna.
    'Triquake-Silver Tome': { times: 3 },

    // Due detriti, ma il testo non indica una percentuale di danno.
    'Tremble-Bronze Crux': { times: 2, damage: 100 },
    'Tremble-Silver Crux': { times: 2, damage: 100 },

    // Abilità difensive/utility: la percentuale nel testo non è danno inflitto.
    'Toxic Gas-Sporeheart Orb': { damage: 0, damageTakenIncreasePercent: 25 },
    'Bound By Spirits-Essencebinder Tome': { damage: 0 },

    // Il parser prende l'ultima %, che qui è la cura: forziamo il danno.
    'Bug Vitality-Glowbug Staff': {
        damage: 75,
        minHits: 1,
        maxHits: 5,
        hitsMatchTimes: true
    },
    'Honey Healing-The Drizzler': { damage: 250 },

    // Death Ledger: 30% ogni 0.5s per 14s, cooldown 14s.
    'Death Ledger-Voras Deathnote': {
        times: 28,
        hitsPerUse: 28,
        cooldown: 14
    },

    // Astro Break: danno selezionabile tra 150% e 300%.
    'Astro Break-Astralweaver': {
        damage: 300,
        minDamage: 150,
        maxDamage: 300
    },

    // Runic Knuckles: 1 hit extra per swing, durata/cooldown 4s.
    'Runic Knuckles-Runic Putrifists': {
        damage: 0,
        extraHitsPerSwing: 1,
        extraHitDamagePercent: 100,
        cooldown: 4
    },

    // Abilità con percentuale non-danno o senza percentuale.
    'Blast Projectile-Oak Wand': { damage: 100 },

    // Royal Praise: riduce la resistenza Nature del nemico del 20% e dà
    // +25% Elemental Power. Non è un'abilità di danno diretto.
    'Royal Praise-Royal Tiara': {
        kind: 'passive',
        damage: 0,
        elementalPowerPercent: 25,
        resistancePercent: { nature: -20 }
    },

    // Soil Infestation: i nemici subiscono il 25% di danno in più.
    'Soil Infestation-Gloomfang Mace': {
        damage: 0,
        damageTakenIncreasePercent: 25
    }
};
