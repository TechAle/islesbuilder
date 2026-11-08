import './types.js';

/**
 * Database augment popolato a runtime dall'API.
 * Qui non vanno scritti valori: solo override di parsing/effetti.
 * @type {import('./types.js').AugmentDefinition[]}
 */
export const AUGMENT_DATABASE = [];

/**
 * Override manuali per gli augment.
 *
 * - `growth`: crescita per livello quando l'API non ha tutti i tier.
 * - `effects`: tipo di effetto e mapping delle statistiche.
 *
 * I valori veri (tier e testi) arrivano da `/api/v1/augments`.
 *
 * @type {{
 *   growth: Record<string, number>,
 *   effects: Record<string, import('./types.js').AugmentEffectOverride>,
 *   fallback: Record<string, {base: number, growth: number}>
 * }}
 */
export const AUGMENT_OVERRIDES = {
    growth: {
        Common: 2,
        Prosecution: 4.5,
        Hunter: 10,
        'Second Wind': 2,
        Enraged: 10
    },
    fallback: {
        // L'API non ha ancora i tier: si assume lo stesso scaling dei comuni.
        'Illusion Damage': { base: 5, growth: 2 }
    },
    effects: {
        'Arcane Damage': { type: 'stat', stat: 'Arcane Damage', percent: true },
        'Aura Damage': { type: 'stat', stat: 'Aura Damage', percent: true },
        'Blunt Damage': { type: 'stat', stat: 'Blunt Damage', percent: true },
        'Heavy Damage': { type: 'stat', stat: 'Heavy Damage', percent: true },
        'Illusion Damage': { type: 'stat', stat: 'Illusion Damage', percent: true },
        'Piercing Damage': { type: 'stat', stat: 'Pierce Damage', percent: true },
        'Slash Damage': { type: 'stat', stat: 'Slash Damage', percent: true },
        'Stab Damage': { type: 'stat', stat: 'Stab Damage', percent: true },
        'Throwable Damage': { type: 'stat', stat: 'Throwables Damage', percent: true },
        'Chain Lightning': { type: 'chainLightning' },
        Combo: { type: 'combo' },
        Deathburst: { type: 'deathburst' },
        Enraged: { type: 'enraged' },
        Execution: { type: 'execution' },
        'First Strike': { type: 'firstStrike' },
        Hunter: { type: 'hunter' },
        Infected: { type: 'infected' },
        "Nature's Bless": { type: 'natureBless' },
        Prosecution: { type: 'prosecution' }
    }
};
