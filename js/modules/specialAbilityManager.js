import {
    onClick,
    passives,
    SPECIAL_ABILITY_OVERRIDES
} from '../data/specialAbilities.js';
import { DEFAULT_ABILITY_COOLDOWN } from '../data/constants.js';
import { getAttackInterval } from './damage/attackTiming.js';
import { getEnergyRegen } from './damage/energy.js';
import { getEnergyCostMultiplier } from './damage/energyCost.js';
import { getDefaultAttackReverseMultiplier, getWeaponClass } from './damage/weaponProps.js';
import { findPercent } from './damage/statLookup.js';

/** @typedef {import('../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../data/types.js').SpecialAbility} SpecialAbility */

/**
 * Gestisce parsing, override e calcolo delle abilità speciali.
 */
export class SpecialAbilityManager {
    /** Svuota le liste delle abilità. */
    reset() {
        onClick.length = 0;
        passives.length = 0;
    }

    /**
     * Cerca un override senza distinguere maiuscole/minuscole.
     * @param {string} fullName
     * @returns {Partial<SpecialAbility>|null}
     */
    findOverride(fullName) {
        const target = fullName.trim().toLowerCase();
        const key = Object.keys(SPECIAL_ABILITY_OVERRIDES)
            .find(entry => entry.trim().toLowerCase() === target);

        return key ? SPECIAL_ABILITY_OVERRIDES[key] : null;
    }

    /**
     * Estrae l'ultimo numero seguito da `%` dal testo dell'abilità.
     * @param {string} text
     * @returns {number}
     */
    extractDamage(text) {
        const matches = String(text ?? '').match(/\d+(?:[.,]\d+)?\s*%/g);
        if (!matches || matches.length === 0) return 0;

        const last = matches[matches.length - 1].replace('%', '').replace(',', '.').trim();
        const value = Number.parseFloat(last);
        return Number.isFinite(value) ? value : 0;
    }

    /**
     * Normalizza il tasto dell'abilità.
     * @param {string|null|undefined} key
     * @returns {'rightClick'|'f'|null}
     */
    normalizeKey(key) {
        const value = String(key ?? '').trim().toLowerCase();
        if (value === 'right click' || value === 'rightclick' || value === 'right-click') {
            return 'rightClick';
        }
        if (value === 'f') return 'f';
        return null;
    }

    /**
     * Converte una voce `abilities` dell'API in una voce interna.
     * @param {string} weaponName
     * @param {any} ability
     * @returns {SpecialAbility|null}
     */
    parseAbility(weaponName, ability) {
        const abilityName = typeof ability === 'string'
            ? ability
            : (ability?.name || ability?.title || '');
        const trimmedAbility = String(abilityName).trim();
        const trimmedWeapon = String(weaponName ?? '').trim();

        if (!trimmedAbility || !trimmedWeapon) return null;

        const isPassive = typeof ability === 'object' && ability?.kind !== 'ability';
        const fullName = `${trimmedAbility}-${trimmedWeapon}`;

        /** @type {SpecialAbility} */
        const entry = {
            name: fullName,
            ability: trimmedAbility,
            weapon: trimmedWeapon,
            kind: isPassive ? 'passive' : 'ability',
            key: isPassive ? null : this.normalizeKey(ability?.key),
            energy: isPassive
                ? null
                : (typeof ability?.energy === 'number' ? ability.energy : 0),
            damage: this.extractDamage(ability?.text),
            times: 1,
            hitsPerUse: 1,
            cooldown: isPassive ? 0 : DEFAULT_ABILITY_COOLDOWN,
            everyHits: null,
            text: typeof ability?.text === 'string' ? ability.text : ''
        };

        const override = this.findOverride(fullName);
        return override ? { ...entry, ...override } : entry;
    }

    /**
     * Registra le abilità di un'arma nelle liste globali.
     * @param {string} weaponName
     * @param {any[]|null|undefined} abilities
     */
    registerAbilities(weaponName, abilities) {
        if (!weaponName || !Array.isArray(abilities)) return;

        abilities.forEach(ability => {
            const entry = this.parseAbility(weaponName, ability);
            if (!entry) return;

            const list = entry.kind === 'passive' ? passives : onClick;
            const index = list.findIndex(existing => (
                existing.name.toLowerCase() === entry.name.toLowerCase()
            ));

            if (index >= 0) list[index] = entry;
            else list.push(entry);
        });
    }

    /**
     * Registra eventuali abilità manuali dichiarate nelle statistiche
     * `Ability 1`, `Ability 2`, ... dell'oggetto (es. override Royal Tiara).
     * Registra solo le voci che hanno un override, per non duplicare quelle
     * già lette da `gear.abilities`.
     *
     * @param {string} itemName
     * @param {Record<string, any>|undefined} stats
     */
    registerAbilitiesFromStats(itemName, stats) {
        if (!itemName || !stats) return;

        Object.entries(stats)
            .filter(([key]) => /^Ability \d+$/.test(key))
            .forEach(([, value]) => {
                const abilityName = String(value ?? '').trim();
                if (!abilityName) return;

                const fullName = `${abilityName}-${String(itemName).trim()}`.toLowerCase();
                const exists = onClick.some(entry => entry.name.toLowerCase() === fullName)
                    || passives.some(entry => entry.name.toLowerCase() === fullName);
                if (exists) return;

                const override = this.findOverride(`${abilityName}-${itemName}`);
                if (!override) return;
                this.registerAbilities(itemName, [{
                    name: abilityName,
                    kind: override.kind === 'passive' ? 'passive' : 'ability'
                }]);
            });
    }

    /**
     * Registra le abilità dagli oggetti già presenti nel catalogo locale.
     * Supporta sia `item.abilities` sia `item.gear.abilities`.
     * @param {Record<string, any[]>} items
     */
    parseFromItems(items) {
        Object.values(items ?? {}).forEach(list => {
            if (!Array.isArray(list)) return;

            list.forEach(item => {
                const abilities = item?.abilities ?? item?.gear?.abilities;
                this.registerAbilities(item?.name ?? item?.gear?.name, abilities);
                this.registerAbilitiesFromStats(
                    item?.name ?? item?.gear?.name,
                    item?.stats
                );
            });
        });
    }

    /**
     * Oggetti equipaggiati con un nome valido.
     * @param {DamageContext} context
     * @returns {Array<{name: string, stats?: Record<string, any>, abilitiesEdited?: boolean}>}
     */
    getEquippedItems(context) {
        return Object.values(context.build?.activeEquip ?? {})
            .filter(item => String(item?.name ?? '').trim());
    }

    /**
     * Nomi delle abilità dichiarate nelle statistiche `Ability N` dell'oggetto.
     * Se l'oggetto non ha più quella statistica, l'abilità non è più attiva.
     * @param {{stats?: Record<string, any>}|null|undefined} item
     * @returns {string[]}
     */
    getItemAbilityNames(item) {
        return Object.entries(item?.stats ?? {})
            .filter(([key]) => /^Ability \d+$/.test(key))
            .map(([, value]) => String(value ?? '').trim())
            .filter(Boolean);
    }

    /**
     * Recupera un'abilità dal catalogo, creandola se esiste un override
     * compatibile con la lista richiesta (ability o passive).
     * @param {SpecialAbility[]} list
     * @param {string} itemName
     * @param {string} abilityName
     * @param {'ability'|'passive'} kind
     * @returns {SpecialAbility|null}
     */
    resolveAbility(list, itemName, abilityName, kind) {
        const fullName = `${abilityName}-${itemName}`.toLowerCase();
        const existing = list.find(entry => entry.name.toLowerCase() === fullName);
        if (existing) return existing;

        // Non registrare un'abilità nella lista sbagliata: se esiste già
        // nell'altra lista, questa voce non appartiene a `kind`.
        const otherList = kind === 'passive' ? onClick : passives;
        if (otherList.some(entry => entry.name.toLowerCase() === fullName)) return null;

        const override = this.findOverride(`${abilityName}-${itemName}`);
        if (!override) return null;

        const overrideKind = override.kind === 'passive' ? 'passive' : 'ability';
        if (overrideKind !== kind) return null;

        this.registerAbilities(itemName, [{
            name: abilityName,
            kind: overrideKind
        }]);

        return list.find(entry => entry.name.toLowerCase() === fullName) ?? null;
    }

    /**
     * Abilità attive di una lista, filtrate per le statistiche `Ability N`
     * presenti sugli oggetti equipaggiati.
     * @param {SpecialAbility[]} list
     * @param {DamageContext} context
     * @param {'ability'|'passive'} kind
     * @returns {SpecialAbility[]}
     */
    getActiveAbilities(list, context, kind) {
        /** @type {SpecialAbility[]} */
        const active = [];
        const seen = new Set();

        /**
         * @param {SpecialAbility|null} ability
         */
        const add = ability => {
            if (!ability) return;
            const key = ability.name.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            active.push(ability);
        };

        this.getEquippedItems(context).forEach(item => {
            const abilityNames = this.getItemAbilityNames(item);

            // Fallback per build/test senza statistiche `Ability N`:
            // usa le abilità registrate per nome oggetto.
            if (abilityNames.length === 0 && !item.abilitiesEdited) {
                list
                    .filter(entry => entry.weapon.toLowerCase() === item.name.toLowerCase())
                    .forEach(add);
                return;
            }

            abilityNames.forEach(abilityName => {
                add(this.resolveAbility(list, item.name, abilityName, kind));
            });
        });

        return active;
    }

    /**
     * Passive attive per gli oggetti equipaggiati.
     * @param {DamageContext} context
     * @returns {SpecialAbility[]}
     */
    getActivePassives(context) {
        return this.getActiveAbilities(passives, context, 'passive');
    }

    /**
     * Abilità onClick attive per gli oggetti equipaggiati.
     * @param {DamageContext} context
     * @returns {SpecialAbility[]}
     */
    getActiveOnClick(context) {
        return this.getActiveAbilities(onClick, context, 'ability');
    }

    /**
     * Hit al secondo aggiunti dalle passive attive, partendo dagli hit
     * non-passive (attacchi, burst, esplosioni, orb).
     *
     * Gli hit della passive contano come hit totali per Crystal Insights,
     * Crystal Combustion e Support Orbs, ma non fanno proc rare a se stessi.
     *
     * @param {DamageContext} context
     * @param {number} baseHitsPerSecond
     * @returns {{hitsPerSecond: number, applied: Array<{name: string, everyHits: number, hitsPerSecond: number}>}}
     */
    getPassiveHitsFromBase(context, baseHitsPerSecond) {
        let hitsPerSecond = 0;
        /** @type {Array<{name: string, everyHits: number, hitsPerSecond: number}>} */
        const applied = [];

        this.getActivePassives(context).forEach(passive => {
            const everyHits = passive.everyHits ?? 0;
            if (!Number.isFinite(everyHits) || everyHits <= 0) return;

            const extraHits = baseHitsPerSecond / everyHits;
            hitsPerSecond += extraHits;
            applied.push({
                name: passive.name,
                everyHits,
                hitsPerSecond: extraHits
            });
        });

        return { hitsPerSecond, applied };
    }

    /**
     * DPS aggiunto dalle passive attive.
     *
     * Il danno della passive parte dall'Average Damage "reverse" (senza Default
     * Attack) e viene applicato una volta ogni `everyHits` hit non-passive.
     *
     * @param {DamageContext} context
     * @param {number} averageDamage
     * @param {number} baseHitsPerSecond
     * @returns {{
     *   dps: number,
     *   reverseMultiplier: number,
     *   applied: Array<{name: string, everyHits: number, damagePercent: number, hitsPerSecond: number, dps: number}>
     * }}
     */
    applyDamagePassives(context, averageDamage, baseHitsPerSecond) {
        const weapon = context.weapon ?? context.build?.activeEquip?.weapon;
        const reverseMultiplier = getDefaultAttackReverseMultiplier(weapon);
        const reversedAverageDamage = averageDamage * reverseMultiplier;

        let dps = 0;
        /** @type {Array<{name: string, everyHits: number, damagePercent: number, hitsPerSecond: number, dps: number}>} */
        const applied = [];

        this.getActivePassives(context).forEach(passive => {
            const everyHits = passive.everyHits ?? 0;
            const damagePercent = passive.damage;

            if (!Number.isFinite(everyHits) || everyHits <= 0) return;
            if (!Number.isFinite(damagePercent) || damagePercent <= 0) return;

            const hitsPerSecond = baseHitsPerSecond / everyHits;
            const passiveDps = hitsPerSecond
                * reversedAverageDamage
                * (damagePercent / 100);

            dps += passiveDps;
            applied.push({
                name: passive.name,
                everyHits,
                damagePercent,
                hitsPerSecond,
                dps: passiveDps
            });
        });

        return { dps, reverseMultiplier, applied };
    }

    /**
     * Cooldown effettivo di un'abilità, rispettando l'override.
     * @param {number} baseCooldown
     * @param {number} overrideCooldown
     * @returns {number}
     */
    resolveCooldown(baseCooldown, overrideCooldown) {
        if (!Number.isFinite(overrideCooldown)) return baseCooldown;

        return Math.min(baseCooldown * 10, Math.max(baseCooldown, overrideCooldown));
    }

    /**
     * Cast rate delle abilità onClick attive.
     * @param {DamageContext} context
     * @returns {{
     *   energyRegen: number,
     *   entries: Array<{
     *     ability: SpecialAbility,
     *     damage: number,
     *     times: number,
     *     hitsPerUse: number,
     *     baseCooldown: number,
     *     cooldown: number,
     *     energy: number,
     *     enabled: boolean,
     *     castsPerSecond: number,
     *     extraHitsPerSecond: number
     *   }>
     * }}
     */
    getOnClickCastStats(context) {
        const disabled = new Set(context.settings?.disabledSpecialAttacks ?? []);
        const cooldownOverrides = context.settings?.abilityCooldownOverrides ?? {};
        const hitOverrides = context.settings?.abilityHitCountOverrides ?? {};
        const damageOverrides = context.settings?.abilityDamageOverrides ?? {};
        const energyRegen = getEnergyRegen(context);
        const attacksPerSecond = 1 / getAttackInterval(context);
        const weapon = context.weapon ?? context.build?.activeEquip?.weapon;
        const weaponClass = getWeaponClass(weapon);
        const abilityCostMultiplier = Math.max(
            0,
            getEnergyCostMultiplier(context.statsValues ?? {}, 'Ability Costs', weaponClass)
        );
        // Swift channels: riduce il cooldown delle abilità onClick dell'arma.
        const abilityCooldownPercent = findPercent(context.statsValues ?? {}, 'Ability Cooldown');
        const abilityCooldownMultiplier = Math.max(0, 1 + abilityCooldownPercent / 100);

        const entries = this.getActiveOnClick(context).map(ability => {
            const baseTimes = ability.times > 0 ? ability.times : 1;
            const minHits = ability.minHits ?? baseTimes;
            const maxHits = ability.maxHits ?? baseTimes;
            const hitOverride = hitOverrides[ability.name];
            const times = Math.min(
                maxHits,
                Math.max(minHits, Number.isFinite(hitOverride) ? hitOverride : baseTimes)
            );

            const minDamage = ability.minDamage ?? ability.damage;
            const maxDamage = ability.maxDamage ?? ability.damage;
            const damageOverride = damageOverrides[ability.name];
            const damage = Math.min(
                maxDamage,
                Math.max(minDamage, Number.isFinite(damageOverride) ? damageOverride : ability.damage)
            );

            const hitsPerUse = ability.hitsMatchTimes
                ? times
                : (ability.hitsPerUse ?? 1);
            const baseCooldown = ability.cooldown > 0 ? ability.cooldown : DEFAULT_ABILITY_COOLDOWN;
            const cooldown = Math.max(
                0.05,
                this.resolveCooldown(baseCooldown, cooldownOverrides[ability.name])
                    * abilityCooldownMultiplier
            );
            const energy = typeof ability.energy === 'number'
                ? Math.max(0, ability.energy * abilityCostMultiplier)
                : 0;
            const enabled = !disabled.has(ability.name);
            const extraHitsPerSecond = enabled
                ? (ability.extraHitsPerSwing ?? 0) * attacksPerSecond
                : 0;

            const cooldownCasts = 1 / cooldown;
            const energyCasts = energy > 0 ? energyRegen / energy : Infinity;
            const castsPerSecond = enabled
                ? Math.max(0, Math.min(cooldownCasts, energyCasts))
                : 0;

            return {
                ability,
                damage,
                times,
                hitsPerUse,
                baseCooldown,
                cooldown,
                energy,
                enabled,
                castsPerSecond,
                extraHitsPerSecond
            };
        });

        return { energyRegen, entries };
    }

    /**
     * Hit al secondo generati dalle abilità onClick attive.
     * @param {DamageContext} context
     * @returns {number}
     */
    getOnClickHitsPerSecond(context) {
        return this.getOnClickCastStats(context).entries.reduce((sum, entry) => {
            if (!entry.enabled) return sum;

            const hasEffect = entry.damage > 0 || entry.extraHitsPerSecond > 0;
            if (!hasEffect) return sum;

            return sum
                + (entry.damage > 0 ? entry.castsPerSecond * entry.hitsPerUse : 0)
                + entry.extraHitsPerSecond;
        }, 0);
    }

    /**
     * Abilità/passive equipaggiate che possono applicare effetti permanenti.
     * @param {DamageContext} context
     * @returns {SpecialAbility[]}
     */
    getActiveEffectAbilities(context) {
        const abilities = [
            ...this.getActiveOnClick(context),
            ...this.getActivePassives(context)
        ];
        if (!context.settings?.firstHit) return abilities;

        // Al primo colpo non sono ancora attivi gli effetti che richiedono
        // un colpo precedente (es. Royal Praise).
        return abilities.filter(ability => !ability.requiresPriorHit);
    }

    /**
     * Elemental Power% fornito da abilità/passive equipaggiate.
     * @param {DamageContext} context
     * @returns {number}
     */
    getAbilityElementalPowerPercent(context) {
        return this.getActiveEffectAbilities(context)
            .reduce((sum, ability) => sum + (ability.elementalPowerPercent ?? 0), 0);
    }

    /**
     * Resistenza al danno del nemico per uno specifico elemento
     * (valore negativo = resistenza ridotta).
     * @param {DamageContext} context
     * @param {string|null} element
     * @returns {number}
     */
    getElementalResistancePercent(context, element) {
        const key = String(element ?? '').trim().toLowerCase();
        if (!key) return 0;

        return this.getActiveEffectAbilities(context).reduce((sum, ability) => {
            const value = ability.resistancePercent?.[key] ?? 0;
            return sum + value;
        }, 0);
    }

    /**
     * Aumento percentuale del danno subito dal nemico (es. Toxic Gas).
     * @param {DamageContext} context
     * @returns {number}
     */
    getDamageTakenIncreasePercent(context) {
        const disabled = new Set(context.settings?.disabledSpecialAttacks ?? []);

        return this.getActiveEffectAbilities(context).reduce((sum, ability) => {
            if (disabled.has(ability.name)) return sum;
            return sum + (ability.damageTakenIncreasePercent ?? 0);
        }, 0);
    }

    /**
     * Statistiche delle abilità onClick dell'arma equipaggiata.
     *
     * Il cast rate è limitato dal cooldown e dall'energia rigenerata:
     * `min(1 / cooldown, energyRegen / energy)`.
     *
     * @param {DamageContext} context
     * @param {number} baseDamage
     * @param {number} [abilityDamageMultiplier] - Moltiplicatore per le weapon abilities
     * @returns {{
     *   reverseMultiplier: number,
     *   energyRegen: number,
     *   abilities: Array<{
     *     name: string,
     *     ability: string,
     *     weapon: string,
     *     key: string|null,
     *     energy: number|null,
     *     energyCost: number,
     *     damagePercent: number,
     *     times: number,
     *     hitsPerUse: number,
     *     baseCooldown: number,
     *     cooldown: number,
     *     enabled: boolean,
     *     damagePerUse: number,
     *     damagePerHit: number,
     *     castsPerSecond: number,
     *     hitsPerSecond: number,
     *     extraHitsPerSecond: number,
     *     extraDps: number,
     *     damageTakenIncreasePercent: number,
     *     minHits: number|null,
     *     maxHits: number|null,
     *     minDamage: number|null,
     *     maxDamage: number|null,
     *     dps: number,
     *     energyPerSecond: number
     *   }>
     * }}
     */
    getOnClickEffects(context, baseDamage, abilityDamageMultiplier = 1) {
        const weapon = context.weapon ?? context.build?.activeEquip?.weapon;
        const reverseMultiplier = getDefaultAttackReverseMultiplier(weapon);
        const safeAbilityMultiplier = Number.isFinite(abilityDamageMultiplier)
            ? Math.max(0, abilityDamageMultiplier)
            : 1;
        const reversedAverageDamage = baseDamage
            * reverseMultiplier
            * safeAbilityMultiplier;
        const { energyRegen, entries } = this.getOnClickCastStats(context);

        const abilities = entries.map(entry => {
            const ability = entry.ability;
            const damagePerHit = reversedAverageDamage * (entry.damage / 100);
            const damagePerUse = damagePerHit * entry.times;
            const extraHitsPerSecond = entry.extraHitsPerSecond;
            const extraDps = extraHitsPerSecond
                * reversedAverageDamage
                * ((ability.extraHitDamagePercent ?? 0) / 100);
            const hitsPerSecond = entry.enabled
                ? (entry.damage > 0 ? entry.castsPerSecond * entry.hitsPerUse : 0)
                    + extraHitsPerSecond
                : 0;

            return {
                name: ability.name,
                ability: ability.ability,
                weapon: ability.weapon,
                key: ability.key,
                energy: ability.energy,
                energyCost: entry.energy,
                damagePercent: entry.damage,
                times: entry.times,
                hitsPerUse: entry.hitsPerUse,
                minHits: ability.minHits ?? null,
                maxHits: ability.maxHits ?? null,
                minDamage: ability.minDamage ?? null,
                maxDamage: ability.maxDamage ?? null,
                baseCooldown: entry.baseCooldown,
                cooldown: entry.cooldown,
                enabled: entry.enabled,
                damagePerUse,
                damagePerHit,
                castsPerSecond: entry.castsPerSecond,
                hitsPerSecond,
                extraHitsPerSecond,
                extraDps,
                damageTakenIncreasePercent: ability.damageTakenIncreasePercent ?? 0,
                dps: damagePerUse * entry.castsPerSecond + extraDps,
                energyPerSecond: entry.castsPerSecond * entry.energy
            };
        });

        return { reverseMultiplier, energyRegen, abilities };
    }
}
