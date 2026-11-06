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
    'Toxic Gas-Sporeheart Orb': { damage: 0 },
    'Bound By Spirits-Essencebinder Tome': { damage: 0 },
    'Blast Projectile-Oak Wand': { damage: 100 }
};
