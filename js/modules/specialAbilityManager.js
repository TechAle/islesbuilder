import {
    onClick,
    passives,
    SPECIAL_ABILITY_OVERRIDES
} from '../data/specialAbilities.js';
import { DEFAULT_ABILITY_COOLDOWN } from '../data/constants.js';
import { getEnergyRegen } from './damage/energy.js';
import { getDefaultAttackReverseMultiplier } from './damage/weaponProps.js';

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
            });
        });
    }

    /**
     * Nomi di tutti gli oggetti equipaggiati.
     * @param {DamageContext} context
     * @returns {Set<string>}
     */
    getEquippedItemNames(context) {
        return new Set(
            Object.values(context.build?.activeEquip ?? {})
                .map(item => String(item?.name ?? '').trim().toLowerCase())
                .filter(Boolean)
        );
    }

    /**
     * Passive attive per gli oggetti equipaggiati.
     * @param {DamageContext} context
     * @returns {SpecialAbility[]}
     */
    getActivePassives(context) {
        const itemNames = this.getEquippedItemNames(context);
        if (itemNames.size === 0) return [];

        return passives.filter(passive => itemNames.has(passive.weapon.toLowerCase()));
    }

    /**
     * Abilità onClick attive per gli oggetti equipaggiati.
     * @param {DamageContext} context
     * @returns {SpecialAbility[]}
     */
    getActiveOnClick(context) {
        const itemNames = this.getEquippedItemNames(context);
        if (itemNames.size === 0) return [];

        return onClick.filter(ability => itemNames.has(ability.weapon.toLowerCase()));
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

        return Math.min(baseCooldown * 5, Math.max(baseCooldown, overrideCooldown));
    }

    /**
     * Cast rate delle abilità onClick attive.
     * @param {DamageContext} context
     * @returns {{
     *   energyRegen: number,
     *   entries: Array<{
     *     ability: SpecialAbility,
     *     times: number,
     *     baseCooldown: number,
     *     cooldown: number,
     *     energy: number,
     *     enabled: boolean,
     *     castsPerSecond: number
     *   }>
     * }}
     */
    getOnClickCastStats(context) {
        const disabled = new Set(context.settings?.disabledSpecialAttacks ?? []);
        const cooldownOverrides = context.settings?.abilityCooldownOverrides ?? {};
        const energyRegen = getEnergyRegen(context);

        const entries = this.getActiveOnClick(context).map(ability => {
            const times = ability.times > 0 ? ability.times : 1;
            const baseCooldown = ability.cooldown > 0 ? ability.cooldown : DEFAULT_ABILITY_COOLDOWN;
            const cooldown = this.resolveCooldown(
                baseCooldown,
                cooldownOverrides[ability.name]
            );
            const energy = typeof ability.energy === 'number' ? ability.energy : 0;
            const enabled = !disabled.has(ability.name);

            const cooldownCasts = 1 / cooldown;
            const energyCasts = energy > 0 ? energyRegen / energy : Infinity;
            const castsPerSecond = enabled
                ? Math.max(0, Math.min(cooldownCasts, energyCasts))
                : 0;

            return {
                ability,
                times,
                baseCooldown,
                cooldown,
                energy,
                enabled,
                castsPerSecond
            };
        });

        return { energyRegen, entries };
    }

    /**
     * Hit al secondo generati dalle abilità onClick attive.
     * Ogni cast conta come un solo hit, indipendentemente da `times`.
     * @param {DamageContext} context
     * @returns {number}
     */
    getOnClickHitsPerSecond(context) {
        return this.getOnClickCastStats(context).entries.reduce((sum, entry) => {
            if (!entry.enabled || entry.ability.damage <= 0) return sum;
            return sum + entry.castsPerSecond;
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
     * @returns {{
     *   reverseMultiplier: number,
     *   energyRegen: number,
     *   abilities: Array<{
     *     name: string,
     *     ability: string,
     *     weapon: string,
     *     key: string|null,
     *     energy: number|null,
     *     damagePercent: number,
     *     times: number,
     *     baseCooldown: number,
     *     cooldown: number,
     *     enabled: boolean,
     *     damagePerUse: number,
     *     damagePerHit: number,
     *     castsPerSecond: number,
     *     dps: number,
     *     energyPerSecond: number
     *   }>
     * }}
     */
    getOnClickEffects(context, baseDamage) {
        const weapon = context.weapon ?? context.build?.activeEquip?.weapon;
        const reverseMultiplier = getDefaultAttackReverseMultiplier(weapon);
        const reversedAverageDamage = baseDamage * reverseMultiplier;
        const { energyRegen, entries } = this.getOnClickCastStats(context);

        const abilities = entries.map(entry => {
            const ability = entry.ability;
            const damagePerHit = reversedAverageDamage * (ability.damage / 100);
            const damagePerUse = damagePerHit * entry.times;

            return {
                name: ability.name,
                ability: ability.ability,
                weapon: ability.weapon,
                key: ability.key,
                energy: ability.energy,
                damagePercent: ability.damage,
                times: entry.times,
                baseCooldown: entry.baseCooldown,
                cooldown: entry.cooldown,
                enabled: entry.enabled,
                damagePerUse,
                damagePerHit,
                castsPerSecond: entry.castsPerSecond,
                dps: damagePerUse * entry.castsPerSecond,
                energyPerSecond: entry.castsPerSecond * entry.energy
            };
        });

        return { reverseMultiplier, energyRegen, abilities };
    }
}
