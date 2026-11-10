import {
    API_AUGMENTS_ENDPOINT,
    API_ITEM_ENDPOINTS,
    DEFAULT_ABILITY_COOLDOWN,
    ITEM_UPGRADE_STAT_PER_LEVEL,
    MAX_ITEM_UPGRADE_LEVEL,
    SLOT_TO_ITEM_CATEGORY
} from './data/constants.js';
import { ITEM_DATABASE } from './data/items.js';
import { AUGMENT_DATABASE } from './data/augments.js';
import { ApiManager } from './modules/apiManager.js';
import { registerAugments } from './modules/augmentManager.js';
import { SpecialAbilityManager } from './modules/specialAbilityManager.js';
import { readNumber } from './modules/damage/statResolver.js';

const BASE_DAMAGE_KEY = '@baseDamage';
const SCALED_DAMAGE_KEY = '@scaledBaseDamage';
const SPECIAL_DPS_KEY = '@specialDps';
const LEVEL_KEY = '@level';

const CATEGORY_OPTIONS = [
    { value: 'all', label: 'All categories' },
    { value: 'weapons', label: 'Weapons' },
    { value: 'armor', label: 'Armor' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'augments', label: 'Augments' },
    { value: 'cores', label: 'Cores' }
];

const STATIC_STAT_OPTIONS = [
    { value: BASE_DAMAGE_KEY, label: 'Base Damage' },
    { value: SCALED_DAMAGE_KEY, label: 'Scaled Base Damage' },
    { value: SPECIAL_DPS_KEY, label: 'Special DPS' },
    { value: LEVEL_KEY, label: 'Base Level' }
];

const META_STATS = new Set([
    'Level',
    'Damage Type',
    'Default Attack',
    'Normal Attack',
    'Weapon Type',
    'element',
    'Augment Slots'
]);

const state = {
    entries: [],
    name: '',
    category: 'all',
    type: 'all',
    ability: 'all',
    level: MAX_ITEM_UPGRADE_LEVEL,
    sortField: '@name',
    sortDirection: 'asc',
    statFilters: []
};

const els = {
    level: document.getElementById('item-level'),
    setLevel: document.getElementById('set-level'),
    levelStatus: document.getElementById('level-status'),
    reset: document.getElementById('reset-filters'),
    searchName: document.getElementById('search-name'),
    category: document.getElementById('filter-category'),
    type: document.getElementById('filter-type'),
    ability: document.getElementById('filter-ability'),
    sortField: document.getElementById('sort-field'),
    sortDirection: document.getElementById('sort-direction'),
    statField: document.getElementById('stat-field'),
    statOperator: document.getElementById('stat-operator'),
    statValue: document.getElementById('stat-value'),
    addStatFilter: document.getElementById('add-stat-filter'),
    activeFilters: document.getElementById('active-filters'),
    status: document.getElementById('items-status'),
    tbody: document.getElementById('items-tbody')
};

function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return '—';
    return value.toLocaleString('it-IT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits
    });
}

function formatStat(value, percent) {
    if (!Number.isFinite(value)) return '—';
    return `${formatNumber(value)}${percent ? '%' : ''}`;
}

function titleCase(value) {
    const text = String(value ?? '');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function humanizeEffectType(value) {
    return String(value ?? '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, char => char.toUpperCase());
}

function normalizeStats(stats) {
    /** @type {Array<{name: string, key: string, value: number, percent: boolean}>} */
    const result = [];

    Object.entries(stats ?? {}).forEach(([key, rawValue]) => {
        if (META_STATS.has(key) || /^Ability \d+$/i.test(key)) return;
        if (rawValue === null || rawValue === undefined || typeof rawValue === 'object') return;

        const rawString = String(rawValue);
        const percent = key.endsWith('%') || rawString.includes('%');
        const name = key.replace(/%$/, '').trim();
        const value = readNumber(rawValue);
        if (!name || !Number.isFinite(value)) return;

        result.push({
            name,
            key: percent ? `${name} %` : name,
            value,
            percent
        });
    });

    return result;
}

function getCategory(raw) {
    const group = String(raw?.group ?? '').toLowerCase();
    if (group.startsWith('weapon')) return { key: 'weapons', label: 'Weapons' };
    if (group.startsWith('armor')) return { key: 'armor', label: 'Armor' };
    if (group.startsWith('accessor')) return { key: 'accessories', label: 'Accessories' };
    return { key: group || 'misc', label: titleCase(group || 'Misc') };
}

function getTargetCategory(gear) {
    const slot = String(gear?.slot ?? '').toLowerCase();
    return SLOT_TO_ITEM_CATEGORY[slot] || slot || 'misc';
}

function getWeaponSpecialAttack(gear, weaponName, parser) {
    let specialDpsPercent = 0;
    let specialTotalPercent = 0;
    let specialName = '';

    (gear?.abilities ?? []).forEach(ability => {
        if (!ability || typeof ability !== 'object') return;

        try {
            const parsed = parser.parseAbility(weaponName, ability, {
                damageType: gear.damageType,
                slot: gear.slot
            });
            if (!parsed || parsed.kind !== 'ability' || !(parsed.damage > 0)) return;

            const times = parsed.times > 0 ? parsed.times : 1;
            const totalPercent = parsed.damage * times;
            const cooldown = parsed.cooldown > 0
                ? parsed.cooldown
                : DEFAULT_ABILITY_COOLDOWN;
            // Confronta le abilità sul danno percentuale al secondo, non sul
            // totale: una Death Ledger da 840% in 14s non è meglio di un Log
            // Throw da 225% ogni 1.6s.
            const dpsPercent = totalPercent / cooldown;
            if (dpsPercent > specialDpsPercent) {
                specialDpsPercent = dpsPercent;
                specialTotalPercent = totalPercent;
                specialName = parsed.ability || ability.name || 'Ability';
            }
        } catch {
            // Ignora abilità malformate: la ricerca deve restare utilizzabile.
        }
    });

    return { specialDpsPercent, specialTotalPercent, specialName };
}

function buildItemEntry(raw, api, abilityParser) {
    const gear = raw?.gear ?? {};
    const name = raw?.name || gear.name || '';
    if (!name) return null;

    const category = getCategory(raw);
    const targetCategory = getTargetCategory(gear);
    const stats = api.formatGearStats(
        gear,
        targetCategory,
        raw?.tooltipJson,
        name
    );
    const baseLevel = Number(stats['Level'] ?? gear.level ?? 0) || 0;
    const damageType = typeof stats['Damage Type'] === 'string'
        ? stats['Damage Type']
        : null;
    const defaultAttack = readNumber(stats['Default Attack']);
    const abilities = (gear.abilities ?? [])
        .map(ability => (
            typeof ability === 'string'
                ? ability
                : (ability?.name || ability?.title || '')
        ))
        .filter(Boolean);
    const { specialDpsPercent, specialTotalPercent, specialName } = getWeaponSpecialAttack(
        gear,
        name,
        abilityParser
    );

    return {
        id: `${category.key}:${name}:${gear.slot ?? ''}`,
        name,
        categoryKey: category.key,
        categoryLabel: category.label,
        type: String(gear.type || gear.slot || 'Unknown'),
        rarity: String(raw?.rarity ?? ''),
        baseLevel,
        rawStats: normalizeStats(stats),
        abilityNames: abilities,
        specialDpsPercent,
        specialTotalPercent,
        specialName,
        defaultAttack,
        damageType,
        isAugment: false,
        isCore: false,
        noScaling: false,
        effectLabel: ''
    };
}

function buildCoreEntry(item) {
    return {
        id: `cores:${item.name}`,
        name: item.name,
        categoryKey: 'cores',
        categoryLabel: 'Cores',
        type: 'Core',
        rarity: 'Core',
        baseLevel: null,
        rawStats: normalizeStats(item.stats),
        abilityNames: [],
        specialDpsPercent: 0,
        specialTotalPercent: 0,
        specialName: '',
        defaultAttack: 0,
        damageType: null,
        isAugment: false,
        isCore: true,
        noScaling: true,
        effectLabel: ''
    };
}

function buildAugmentEntry(augment) {
    const maxLevel = augment.levels?.[augment.levels.length - 1];
    const effectType = augment.effect?.type ?? 'none';
    const effectValue = maxLevel?.value ?? 0;
    const effectStat = augment.effect?.stat;
    const isStatEffect = effectType === 'stat' && effectStat;
    const effectName = isStatEffect
        ? effectStat
        : (effectType === 'none' ? 'Effect' : humanizeEffectType(effectType));
    const valuePercent = effectType !== 'natureBless';

    const rawStats = [
        {
            name: 'Augment Value',
            key: valuePercent ? 'Augment Value %' : 'Augment Value',
            value: effectValue,
            percent: valuePercent
        }
    ];
    if (maxLevel?.level) {
        rawStats.push({
            name: 'Max Tier',
            key: 'Max Tier',
            value: maxLevel.level,
            percent: false
        });
    }

    return {
        id: `augments:${augment.name}:${augment.goesIn}`,
        name: augment.name,
        categoryKey: 'augments',
        categoryLabel: 'Augments',
        type: augment.goesIn === 'weapon' ? 'Weapon Augment' : 'Armor Augment',
        rarity: String(augment.rarity ?? ''),
        baseLevel: null,
        rawStats,
        abilityNames: [],
        specialDpsPercent: 0,
        specialTotalPercent: 0,
        specialName: '',
        defaultAttack: 0,
        damageType: null,
        isAugment: true,
        isCore: false,
        noScaling: true,
        effectLabel: `${effectName}: ${formatNumber(effectValue)}${valuePercent ? '%' : ''}`
    };
}

function hasNormalAttack(raw) {
    const normal = raw?.gear?.normalAttack;
    return normal !== null && normal !== undefined;
}

function dedupeItems(rawItems) {
    const map = new Map();

    rawItems.forEach(raw => {
        const name = String(raw?.name ?? '').trim().toLowerCase();
        const slot = String(raw?.gear?.slot ?? '').trim().toLowerCase();
        if (!name || !slot) return;

        const key = `${name}|${slot}`;
        const existing = map.get(key);
        if (!existing || (!hasNormalAttack(existing) && hasNormalAttack(raw))) {
            map.set(key, raw);
        }
    });

    return [...map.values()];
}

async function loadEntries() {
    const api = new ApiManager({ dataStore: /** @type {any} */ ({}) });
    const abilityParser = new SpecialAbilityManager();
    const errors = [];
    const rawItems = [];

    const itemResults = await Promise.allSettled(
        API_ITEM_ENDPOINTS.map(endpoint => api.fetchJson(endpoint))
    );
    itemResults.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            rawItems.push(...result.value);
        } else if (result.status === 'rejected') {
            errors.push(result.reason);
        }
    });

    let rawAugments = [];
    try {
        rawAugments = await api.fetchJson(API_AUGMENTS_ENDPOINT);
        if (!Array.isArray(rawAugments)) rawAugments = [];
        registerAugments(rawAugments);
    } catch (error) {
        errors.push(error);
    }

    const entries = [];
    dedupeItems(rawItems).forEach(raw => {
        try {
            const entry = buildItemEntry(raw, api, abilityParser);
            if (entry) entries.push(entry);
        } catch (error) {
            errors.push(error);
        }
    });

    (ITEM_DATABASE.core ?? []).forEach(item => {
        entries.push(buildCoreEntry(item));
    });

    AUGMENT_DATABASE.forEach(augment => {
        entries.push(buildAugmentEntry(augment));
    });

    return { entries, errors };
}

function buildView(entry) {
    const upgradeLevel = entry.noScaling || entry.isAugment || entry.isCore
        ? 0
        : Math.max(0, state.level - entry.baseLevel);
    const upgradeMultiplier = 1 + upgradeLevel * ITEM_UPGRADE_STAT_PER_LEVEL;

    const stats = entry.rawStats.map(stat => ({
        ...stat,
        value: stat.value * upgradeMultiplier
    }));

    const statsMap = {};
    stats.forEach(stat => {
        statsMap[stat.key] = stat.value;
    });

    const damageStat = entry.damageType
        ? stats.find(stat => (
            !stat.percent
            && stat.name === `${entry.damageType} Damage`
        ))?.value ?? 0
        : 0;

    const baseDamage = damageStat;
    const scaledBaseDamage = baseDamage * (entry.defaultAttack / 100);
    // Danno al secondo dell'abilità migliore: base × DPS% / 100.
    const specialDpsDamage = baseDamage * (entry.specialDpsPercent / 100);

    statsMap[BASE_DAMAGE_KEY] = baseDamage;
    statsMap[SCALED_DAMAGE_KEY] = scaledBaseDamage;
    statsMap[SPECIAL_DPS_KEY] = specialDpsDamage;
    statsMap[LEVEL_KEY] = entry.baseLevel === null ? undefined : entry.baseLevel;

    return {
        entry,
        stats,
        statsMap,
        baseDamage,
        scaledBaseDamage,
        specialDpsDamage
    };
}

function isItemAboveLevel(entry) {
    return !entry.isAugment
        && !entry.isCore
        && entry.baseLevel > state.level;
}

function compareValues(actual, operator, expected) {
    const epsilon = 1e-9;
    if (operator === 'eq') return Math.abs(actual - expected) < epsilon;
    if (operator === 'gt') return actual > expected;
    if (operator === 'gte') return actual >= expected - epsilon;
    if (operator === 'lt') return actual < expected;
    if (operator === 'lte') return actual <= expected + epsilon;
    return false;
}

function matchesFilters(view) {
    const entry = view.entry;

    if (entry.categoryKey !== state.category && state.category !== 'all') return false;
    if (entry.type !== state.type && state.type !== 'all') return false;
    if (state.ability !== 'all' && !entry.abilityNames.includes(state.ability)) return false;
    if (state.name && !entry.name.toLowerCase().includes(state.name.toLowerCase())) {
        return false;
    }
    if (isItemAboveLevel(entry)) return false;

    return state.statFilters.every(filter => {
        const value = view.statsMap[filter.stat];
        return value !== undefined
            && Number.isFinite(value)
            && compareValues(value, filter.operator, filter.value);
    });
}

function getSortValue(view, field) {
    if (field === '@name') return view.entry.name.toLowerCase();
    return view.statsMap[field];
}

function sortViews(views) {
    const direction = state.sortDirection === 'asc' ? 1 : -1;
    const field = state.sortField;

    return views.sort((a, b) => {
        const aValue = getSortValue(a, field);
        const bValue = getSortValue(b, field);

        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;

        if (typeof aValue === 'string' || typeof bValue === 'string') {
            return String(aValue).localeCompare(String(bValue), undefined, {
                sensitivity: 'base'
            }) * direction;
        }

        return (aValue - bValue) * direction;
    });
}

function getVisibleViews() {
    return sortViews(
        state.entries
            .map(entry => buildView(entry))
            .filter(matchesFilters)
    );
}

function getStatsForAllEntries() {
    const keys = new Set();
    state.entries.forEach(entry => {
        entry.rawStats.forEach(stat => keys.add(stat.key));
    });
    return [...keys].sort((a, b) => a.localeCompare(b, undefined, {
        sensitivity: 'base'
    }));
}

function getTypesForCategory() {
    const types = new Set();
    state.entries.forEach(entry => {
        if (state.category === 'all' || entry.categoryKey === state.category) {
            types.add(entry.type);
        }
    });
    return [...types].sort((a, b) => a.localeCompare(b, undefined, {
        sensitivity: 'base'
    }));
}

function getAbilities() {
    const abilities = new Set();
    state.entries.forEach(entry => {
        entry.abilityNames.forEach(name => abilities.add(name));
    });
    return [...abilities].sort((a, b) => a.localeCompare(b, undefined, {
        sensitivity: 'base'
    }));
}

function setSelectOptions(select, options, selectedValue) {
    select.replaceChildren();
    options.forEach(option => {
        const element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        select.appendChild(element);
    });

    const exists = options.some(option => option.value === selectedValue);
    select.value = exists ? selectedValue : (options[0]?.value ?? '');
}

function refreshFilterOptions() {
    setSelectOptions(els.category, CATEGORY_OPTIONS, state.category);

    const typeOptions = [
        { value: 'all', label: 'All types' },
        ...getTypesForCategory().map(type => ({ value: type, label: type }))
    ];
    setSelectOptions(els.type, typeOptions, state.type);
    if (!typeOptions.some(option => option.value === state.type)) {
        state.type = 'all';
        els.type.value = 'all';
    }

    const abilityOptions = [
        { value: 'all', label: 'Any ability' },
        ...getAbilities().map(ability => ({ value: ability, label: ability }))
    ];
    setSelectOptions(els.ability, abilityOptions, state.ability);
    if (!abilityOptions.some(option => option.value === state.ability)) {
        state.ability = 'all';
        els.ability.value = 'all';
    }

    const statKeys = getStatsForAllEntries();
    const statOptions = [
        ...STATIC_STAT_OPTIONS,
        ...statKeys.map(key => ({ value: key, label: key }))
    ];
    setSelectOptions(els.statField, statOptions, els.statField.value);

    const sortOptions = [
        { value: '@name', label: 'Name' },
        ...STATIC_STAT_OPTIONS,
        ...statKeys.map(key => ({ value: key, label: key }))
    ];
    setSelectOptions(els.sortField, sortOptions, state.sortField);
}

function setStatus(message, error = false) {
    els.status.textContent = message;
    els.status.classList.toggle('items-status--error', error);
}

function renderActiveFilters() {
    els.activeFilters.replaceChildren();

    state.statFilters.forEach((filter, index) => {
        const chip = document.createElement('span');
        chip.className = 'items-filter-chip';

        const label = document.createElement('span');
        label.textContent = `${filter.stat} ${filter.operatorLabel} ${formatNumber(filter.value)}`;

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove ${filter.stat} filter`);
        remove.addEventListener('click', () => {
            state.statFilters.splice(index, 1);
            render();
        });

        chip.appendChild(label);
        chip.appendChild(remove);
        els.activeFilters.appendChild(chip);
    });
}

function makeCell(className = '') {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    return cell;
}

function makeStatChips(stats) {
    const wrapper = document.createElement('div');
    wrapper.className = 'items-stats';

    stats.forEach(stat => {
        const chip = document.createElement('span');
        chip.className = 'items-stat-chip';
        chip.textContent = `${stat.name}: ${formatStat(stat.value, stat.percent)}`;
        wrapper.appendChild(chip);
    });

    return wrapper;
}

function appendRow(view) {
    const entry = view.entry;
    const row = document.createElement('tr');

    const nameCell = makeCell();
    const name = document.createElement('span');
    name.className = 'items-name';
    name.textContent = entry.name;
    nameCell.appendChild(name);

    const typeCell = makeCell();
    typeCell.textContent = `${entry.categoryLabel} · ${entry.type}`;

    const levelCell = makeCell('items-num');
    levelCell.textContent = entry.baseLevel === null
        ? '—'
        : String(entry.baseLevel);

    const baseCell = makeCell('items-num');
    baseCell.textContent = view.baseDamage > 0
        ? formatNumber(view.baseDamage)
        : '—';

    const scaledCell = makeCell('items-num');
    scaledCell.textContent = view.scaledBaseDamage > 0
        ? formatNumber(view.scaledBaseDamage)
        : '—';

    const specialCell = makeCell('items-num');
    specialCell.textContent = view.specialDpsDamage > 0
        ? formatNumber(view.specialDpsDamage)
        : '—';

    const abilityCell = makeCell('items-ability');
    if (entry.isAugment) {
        abilityCell.textContent = entry.effectLabel;
    } else if (entry.specialDpsPercent > 0) {
        abilityCell.textContent = `${entry.specialName} (${formatNumber(entry.specialDpsPercent)}%/s)`;
        abilityCell.title = `${entry.specialName}: ${formatNumber(entry.specialTotalPercent)}% totali, ${formatNumber(entry.specialDpsPercent)}%/s`;
    } else {
        abilityCell.textContent = entry.abilityNames.join(', ') || '—';
    }

    const statsCell = makeCell();
    statsCell.appendChild(makeStatChips(view.stats));

    row.appendChild(nameCell);
    row.appendChild(typeCell);
    row.appendChild(levelCell);
    row.appendChild(baseCell);
    row.appendChild(scaledCell);
    row.appendChild(specialCell);
    row.appendChild(abilityCell);
    row.appendChild(statsCell);
    els.tbody.appendChild(row);
}

function render() {
    const views = getVisibleViews();
    els.tbody.replaceChildren();

    views.forEach(appendRow);

    if (views.length === 0) {
        const row = document.createElement('tr');
        const cell = makeCell();
        cell.colSpan = 8;
        cell.textContent = 'No items match the current filters.';
        row.appendChild(cell);
        els.tbody.appendChild(row);
    }

    const hiddenByLevel = state.entries.filter(isItemAboveLevel).length;
    const parts = [`${views.length} result${views.length === 1 ? '' : 's'}`];
    if (hiddenByLevel > 0) {
        parts.push(`${hiddenByLevel} hidden above level ${state.level}`);
    }
    els.levelStatus.textContent = `Level ${state.level}`;
    setStatus(parts.join(' · '));
    renderActiveFilters();
    els.sortField.value = state.sortField;
    els.sortDirection.value = state.sortDirection;
}

function updateTypeOptions() {
    const typeOptions = [
        { value: 'all', label: 'All types' },
        ...getTypesForCategory().map(type => ({ value: type, label: type }))
    ];
    setSelectOptions(els.type, typeOptions, state.type);
    if (!typeOptions.some(option => option.value === state.type)) {
        state.type = 'all';
        els.type.value = 'all';
    }
}

function bindEvents() {
    els.searchName.addEventListener('input', event => {
        state.name = event.target.value.trim();
        render();
    });

    els.category.addEventListener('change', event => {
        state.category = event.target.value;
        updateTypeOptions();
        render();
    });

    els.type.addEventListener('change', event => {
        state.type = event.target.value;
        render();
    });

    els.ability.addEventListener('change', event => {
        state.ability = event.target.value;
        render();
    });

    els.sortField.addEventListener('change', event => {
        state.sortField = event.target.value;
        render();
    });

    els.sortDirection.addEventListener('change', event => {
        state.sortDirection = event.target.value;
        render();
    });

    els.setLevel.addEventListener('click', () => {
        const parsed = Number.parseInt(els.level.value, 10);
        const level = Number.isFinite(parsed)
            ? Math.min(MAX_ITEM_UPGRADE_LEVEL, Math.max(1, parsed))
            : MAX_ITEM_UPGRADE_LEVEL;

        state.level = level;
        els.level.value = String(level);
        render();
    });

    els.addStatFilter.addEventListener('click', () => {
        const stat = els.statField.value;
        const operator = els.statOperator.value;
        const rawValue = Number.parseFloat(els.statValue.value.replace(',', '.'));

        if (!stat) {
            setStatus('Select a stat first.', true);
            return;
        }
        if (!Number.isFinite(rawValue)) {
            setStatus('Enter a numeric value for the stat filter.', true);
            return;
        }

        const operatorLabels = {
            eq: '=',
            gt: '>',
            gte: '≥',
            lt: '<',
            lte: '≤'
        };

        state.statFilters.push({
            stat,
            operator,
            operatorLabel: operatorLabels[operator] ?? operator,
            value: rawValue
        });
        els.statValue.value = '';
        render();
    });

    els.statValue.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            els.addStatFilter.click();
        }
    });

    els.reset.addEventListener('click', () => {
        state.name = '';
        state.category = 'all';
        state.type = 'all';
        state.ability = 'all';
        state.level = MAX_ITEM_UPGRADE_LEVEL;
        state.sortField = '@name';
        state.sortDirection = 'asc';
        state.statFilters = [];

        els.searchName.value = '';
        els.sortDirection.value = 'asc';
        els.level.value = String(MAX_ITEM_UPGRADE_LEVEL);

        refreshFilterOptions();
        render();
    });

    document.querySelectorAll('th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            if (!field) return;

            if (state.sortField === field) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortField = field;
                state.sortDirection = 'asc';
            }

            render();
        });
    });
}

async function main() {
    bindEvents();
    setStatus('Loading items...');

    try {
        const { entries, errors } = await loadEntries();
        state.entries = entries;
        refreshFilterOptions();
        render();

        if (errors.length > 0 && entries.length === 0) {
            setStatus('Could not load item data.', true);
        } else if (errors.length > 0) {
            setStatus(`Loaded ${entries.length} entries. Some endpoints failed.`, true);
        }
    } catch (error) {
        console.error(error);
        setStatus('Could not load item data.', true);
    }
}

main();
