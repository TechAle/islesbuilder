import { DataStore } from './store/dataStore.js';
import { BuildStore } from './store/equippedStore.js';
import { selectStats, withBaseStats } from './store/selectors.js';

import { ApiManager } from './modules/apiManager.js';
import { ElixirManager } from './modules/elixirManager.js';
import { ItemManager } from './modules/itemManager.js';
import { ShareManager } from './modules/shareManager.js';
import { SkillTreeManager } from './modules/skillTreeManager.js';
import { DpsManager } from './modules/dpsManager.js';
import { SpecialAbilityManager } from './modules/specialAbilityManager.js';
import { simulateEnemy } from './modules/enemySimulator.js';
import { EquipRenderer } from './renderers/equipRenderer.js';
import { ElixirRenderer } from './renderers/elixirRenderer.js';
import { ItemModalRenderer } from './renderers/itemModalRenderer.js';
import { ShareRenderer } from './renderers/shareRenderer.js';
import { SkillTreeRenderer } from './renderers/skillTreeRenderer.js';
import { StatsRenderer } from './renderers/statsRenderer.js';
import { DamageRenderer } from './renderers/damageRenderer.js';
import { DamageBreakdownRenderer } from './renderers/damageBreakdownRenderer.js';
import { SectionRenderer } from './renderers/sectionRenderer.js';
import { DamageSettingsRenderer } from './renderers/damageSettingsRenderer.js';
import { EnemySimulatorRenderer } from './renderers/enemySimulatorRenderer.js';
import { TooltipRenderer } from './renderers/tooltipRenderer.js';

import { ITEM_DATABASE } from './data/items.js';
import { AUGMENT_DATABASE } from './data/augments.js';
import { INITIAL_ELIXIRS } from './data/elixirs.js';
import { CLASS_SKILL_TREES } from './data/skillTrees.js';
import { MONSTER_PRESETS } from './data/monsters.js';
import { getAugmentSuggestions } from './modules/augmentManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Store ---------------------------------------------------------
    const dataStore = new DataStore({
        items: ITEM_DATABASE,
        augments: AUGMENT_DATABASE,
        elixirsConfig: INITIAL_ELIXIRS,
        skillTrees: CLASS_SKILL_TREES
    });
    window.dataStore = dataStore;

    const specialAbilityManager = new SpecialAbilityManager();
    window.specialAbilityManager = specialAbilityManager;

    // Le abilità speciali vengono estratte dal catalogo locale prima del
    // primo render; l'API le risincronizza subito dopo.
    specialAbilityManager.parseFromItems(dataStore.data.items);

    const equippedStore = new BuildStore({
        skillTrees: dataStore.data.skillTrees,
        elixirsConfig: dataStore.data.elixirsConfig
    });
    window.equippedStore = equippedStore;

    // --- Logica / servizi ----------------------------------------------
    const itemManager = new ItemManager({ dataStore, equippedStore });
    const elixirManager = new ElixirManager({ equippedStore });
    const skillTreeManager = new SkillTreeManager({ dataStore, equippedStore });
    const shareManager = new ShareManager({ dataStore, equippedStore, location: window.location });
    const apiManager = new ApiManager({ dataStore, specialAbilityManager });
    const dpsManager = new DpsManager({ specialAbilityManager });
    const firstHitDpsManager = new DpsManager({ specialAbilityManager });

    // --- Renderer ------------------------------------------------------
    const itemModalRenderer = new ItemModalRenderer({
        root: document,
        onSave: (slot, name, rows) => itemManager.saveCustomItem(slot, name, rows)
    });

    const equipRenderer = new EquipRenderer({
        root: document,
        onItemChange: (slot, value) => itemManager.handleItemInput(slot, value),
        onUpgradeChange: (slot, value) => itemManager.handleUpgradeInput(slot, value),
        onAugmentChange: (slot, index, value) => itemManager.handleAugmentInput(slot, index, value),
        onOpenModal: slot => itemModalRenderer.open(slot, equippedStore.state.activeEquip[slot])
    });

    const elixirRenderer = new ElixirRenderer({
        root: document.getElementById('elixirs-container'),
        maxButton: /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-elixir-max')),
        zeroButton: /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-elixir-zero')),
        onValueChange: (index, value) => elixirManager.handleChange(index, value),
        onSetAll: value => elixirManager.setAll(value)
    });

    const skillTreeRenderer = new SkillTreeRenderer({
        root: document.getElementById('nodes'),
        svg: /** @type {SVGSVGElement|null} */ (document.getElementById('wires')),
        pointsEl: document.getElementById('points'),
        classButtons: /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.class-btn')),
        onNodeClick: (id, event) => skillTreeManager.handleNodeClick(id, event),
        onClassChange: className => equippedStore.setCurrentClass(className),
        getNodeInfo: id => skillTreeManager.getNodeInfo(id)
    });

    const pointsInput = /** @type {HTMLInputElement|null} */ (document.getElementById('points'));
    pointsInput?.addEventListener('change', () => {
        const parsed = Number.parseInt(pointsInput.value, 10);
        equippedStore.setSharedPoints(Number.isFinite(parsed) ? parsed : 0);
    });

    const statsRenderer = new StatsRenderer({
        root: document.getElementById('detailed-stats-container')
    });

    const damageRenderer = new DamageRenderer({
        root: document.getElementById('damage-steps-container'),
        dpsValue: document.getElementById('damage-dps')
    });

    const damageBreakdownRenderer = new DamageBreakdownRenderer({
        root: document.getElementById('damage-breakdown')
    });

    const enemySimulatorRenderer = new EnemySimulatorRenderer({
        root: document,
        monsters: MONSTER_PRESETS,
        onSimulate: () => renderCombat()
    });

    const tooltipRenderer = new TooltipRenderer({
        root: document,
        tooltip: document.getElementById('global-tooltip')
    });

    /** @type {import('./data/types.js').DamageSettings} */
    let damageSettings = {
        slowAttack: false,
        attackInterval: null,
        useBurst: false,
        griefUptime: 100,
        lastSorrowUptime: 100,
        focusStacks: 0,
        nearbyPlayers: 0,
        sharpshooterResetsPerSecond: 0,
        potentialChargeKills: 0,
        ultimateKillsPerSecond: 0.2,
        crystalExplosionOverride: false,
        crystalExplosionsPerSecond: 0,
        disabledSpecialAttacks: [],
        abilityCooldownOverrides: {},
        abilityHitCountOverrides: {},
        abilityDamageOverrides: {},
        executionHpPercent: 50,
        prosecutionHpPercent: 50,
        enragedHpPercent: 50,
        infectedHitsOverride: 0,
        deathburstKillsPerSecond: 0.2,
        calculatedStrikeKillsPerSecond: 0
    };

    const damageSettingsRenderer = new DamageSettingsRenderer({
        button: /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-damage-settings')),
        panel: document.getElementById('damage-settings'),
        slowAttack: /** @type {HTMLInputElement|null} */ (document.getElementById('setting-slow-attack')),
        slowAttackValue: /** @type {HTMLInputElement|null} */ (document.getElementById('setting-slow-attack-value')),
        useBurst: /** @type {HTMLInputElement|null} */ (document.getElementById('setting-use-burst')),
        griefUptime: /** @type {HTMLInputElement|null} */ (document.getElementById('grief-uptime')),
        griefUptimeValue: document.getElementById('grief-uptime-value'),
        lastSorrowUptime: /** @type {HTMLInputElement|null} */ (document.getElementById('last-sorrow-uptime')),
        lastSorrowUptimeValue: document.getElementById('last-sorrow-uptime-value'),
        focusStacks: /** @type {HTMLInputElement|null} */ (document.getElementById('focus-stacks')),
        focusStacksValue: document.getElementById('focus-stacks-value'),
        nearbyPlayers: /** @type {HTMLInputElement|null} */ (document.getElementById('nearby-players')),
        nearbyPlayersValue: document.getElementById('nearby-players-value'),
        sharpshooterResets: /** @type {HTMLInputElement|null} */ (document.getElementById('sharpshooter-resets')),
        sharpshooterResetsValue: document.getElementById('sharpshooter-resets-value'),
        potentialChargeKills: /** @type {HTMLInputElement|null} */ (document.getElementById('potential-charge-kills')),
        potentialChargeKillsValue: document.getElementById('potential-charge-kills-value'),
        ultimateKills: /** @type {HTMLInputElement|null} */ (document.getElementById('ultimate-kills')),
        ultimateKillsValue: document.getElementById('ultimate-kills-value'),
        crystalExplosionOverride: /** @type {HTMLInputElement|null} */ (document.getElementById('crystal-explosion-override')),
        crystalExplosions: /** @type {HTMLInputElement|null} */ (document.getElementById('crystal-explosions')),
        crystalExplosionsValue: document.getElementById('crystal-explosions-value'),
        executionHp: /** @type {HTMLInputElement|null} */ (document.getElementById('execution-hp')),
        executionHpValue: document.getElementById('execution-hp-value'),
        prosecutionHp: /** @type {HTMLInputElement|null} */ (document.getElementById('prosecution-hp')),
        prosecutionHpValue: document.getElementById('prosecution-hp-value'),
        enragedHp: /** @type {HTMLInputElement|null} */ (document.getElementById('enraged-hp')),
        enragedHpValue: document.getElementById('enraged-hp-value'),
        infectedHits: /** @type {HTMLInputElement|null} */ (document.getElementById('infected-hits')),
        infectedHitsValue: document.getElementById('infected-hits-value'),
        deathburstKills: /** @type {HTMLInputElement|null} */ (document.getElementById('deathburst-kills')),
        deathburstKillsValue: document.getElementById('deathburst-kills-value'),
        calculatedStrikeKills: /** @type {HTMLInputElement|null} */ (document.getElementById('calculated-strike-kills')),
        calculatedStrikeKillsValue: document.getElementById('calculated-strike-kills-value'),
        specialAttacksRow: document.getElementById('setting-special-attacks'),
        specialAttacksContainer: document.getElementById('setting-special-attack-list'),
        onChange: settings => {
            damageSettings = settings;
            renderCombat();
        }
    });

    const shareRenderer = new ShareRenderer({
        root: document,
        onShare: () => shareRenderer.copyLink(shareManager.createShareUrl()),
        onPaste: () => {
            const input = shareRenderer.promptForLink();
            if (!input) return;

            const hash = shareManager.extractHash(input);
            if (!hash || !shareManager.loadFromHash(hash)) {
                shareRenderer.alertInvalid();
                return;
            }

            window.location.hash = hash;
        }
    });

    const sectionRenderer = new SectionRenderer({ root: document });

    // --- Mount ---------------------------------------------------------
    equipRenderer.mount();
    itemModalRenderer.mount();
    elixirRenderer.mount();
    skillTreeRenderer.mount();
    shareRenderer.mount();
    sectionRenderer.mount();
    damageSettingsRenderer.mount();
    enemySimulatorRenderer.mount();
    tooltipRenderer.mount();

    // --- Render helpers ------------------------------------------------
    // Le statistiche sono la base del calcolo danni: vengono calcolate una
    // volta sola e passate sia allo stats renderer sia a DpsManager.
    const renderCombat = () => {
        const { statsValues, skillValues } = selectStats(dataStore.data, equippedStore.state);
        statsRenderer.render(withBaseStats(statsValues));

        // Il TTK del target serve a Sharpshooter (ramp) e Infected (stack).
        const targetInputs = enemySimulatorRenderer.getInputs();
        const combatSettings = {
            ...damageSettings,
            targetHealth: targetInputs.health,
            targetDefense: targetInputs.defense
        };

        dpsManager.recalculate({
            statsValues,
            skillValues,
            build: equippedStore.state,
            skillTrees: dataStore.data.skillTrees,
            settings: combatSettings
        });

        // Primo colpo: stessi modificatori del calcolo normale, ma senza gli
        // effetti che si attivano solo dopo aver colpito (es. Royal Praise).
        firstHitDpsManager.recalculate({
            statsValues,
            skillValues,
            build: equippedStore.state,
            skillTrees: dataStore.data.skillTrees,
            settings: { ...combatSettings, firstHit: true }
        });

        const firstHitDamage = firstHitDpsManager.getSteps().augmentFinal?.damage
            ?? firstHitDpsManager.getSteps().criticalDamage?.damage
            ?? 0;
        const firstStrikePercent = firstHitDpsManager.getSteps().augmentFinal?.firstStrikePercent ?? 0;
        const attackStep = dpsManager.getSteps().attackSpeed;
        if (attackStep) attackStep.firstHitDamage = firstHitDamage;

        damageRenderer.render(dpsManager.getStepGroups(), dpsManager.getDps());
        damageBreakdownRenderer.render(dpsManager.getDamageBreakdown());

        damageSettingsRenderer.configureSpecialAttacks(
            dpsManager.getSteps().specialAttacks?.abilities ?? []
        );

        damageSettingsRenderer.placeSlowAttackControl(
            damageRenderer.getStepContent('attackSpeed')
        );
        damageSettingsRenderer.placeCalculatedStrikeControl(
            damageRenderer.getStepContent('attackSpeed'),
            (dpsManager.getSteps().attackSpeed?.calculatedStrikePercent ?? 0) > 0
        );
        damageSettingsRenderer.placeSharpshooterResetsControl(
            damageRenderer.getStepContent('sharpshooter'),
            dpsManager.getSteps().sharpshooter?.visible === true
        );
        damageSettingsRenderer.placeBurstControl(
            damageRenderer.getStepContent('burst')
        );
        damageSettingsRenderer.placeSpecialAttacksControl(
            damageRenderer.getStepContent('specialAttacks')
        );

        const griefPercent = dpsManager.getSteps().damageMultiplier?.griefInflictionPercent ?? 0;
        const lastSorrowPercent = dpsManager.getSteps().damageMultiplier?.lastSorrowPercent ?? 0;
        const focusPercent = dpsManager.getSteps().damageMultiplier?.focusStacksPercent ?? 0;
        const focusMaxStacks = dpsManager.getSteps().damageMultiplier?.focusMaxStacks ?? 3;
        damageSettingsRenderer.configureFocusSlider(focusMaxStacks);
        damageSettingsRenderer.placeUptimeControls(
            damageRenderer.getStepContent('damageMultiplier'),
            {
                grief: griefPercent > 0,
                lastSorrow: lastSorrowPercent > 0,
                focus: focusPercent > 0
            }
        );

        const potentialCharge = dpsManager.getSteps().burst?.potentialChargeSeconds ?? 0;
        damageSettingsRenderer.placePotentialChargeControl(
            damageRenderer.getStepContent('burst'),
            potentialCharge > 0
        );
        damageSettingsRenderer.placeNearbyPlayersControl(
            damageRenderer.getStepContent('criticalDamage'),
            dpsManager.getSteps().criticalDamage?.itemSets?.hasAlliance === true
        );
        damageSettingsRenderer.placeUltimateKillsControl(
            damageRenderer.getStepContent('burst'),
            dpsManager.getSteps().burst?.hasSecondWind === true
        );

        const crystalCombustion = dpsManager.getSteps().crystalCombustion;
        damageSettingsRenderer.configureCrystalExplosionSlider(
            crystalCombustion?.maxExplosions ?? 0
        );
        damageSettingsRenderer.placeCrystalExplosionsControl(
            damageRenderer.getStepContent('crystalCombustion'),
            crystalCombustion?.enabled === true
        );

        const augmentStep = dpsManager.getSteps().augmentDamage;
        const augmentFinalStep = dpsManager.getSteps().augmentFinal;
        damageSettingsRenderer.placeAugmentControls(
            damageRenderer.getStepContent('damageMultiplier'),
            {
                executionHp: augmentFinalStep?.hasExecution === true,
                prosecutionHp: augmentFinalStep?.hasProsecution === true,
                enragedHp: augmentFinalStep?.hasEnraged === true,
                infected: augmentFinalStep?.hasInfected === true,
                deathburst: augmentStep?.hasDeathburst === true
            }
        );

        // --- Enemy Simulator ------------------------------------------
        const energyPerSecond = attackStep?.energyPerSecondAttackBurstSpecial
            ?? attackStep?.energyPerSecondAttackBurst
            ?? attackStep?.energyPerSecond
            ?? 0;
        const element = dpsManager.getSteps().damageModifiers?.element ?? null;
        enemySimulatorRenderer.syncElement(element);

        // Rilegge i valori dopo syncElement: il Damage% può essere stato
        // aggiornato in base all'elemento dell'arma corrente.
        const enemyInputs = enemySimulatorRenderer.getInputs();

        enemySimulatorRenderer.render(simulateEnemy({
            health: enemyInputs.health,
            defense: enemyInputs.defense,
            damagePercent: enemyInputs.damagePercent,
            firstStrikePercent,
            firstHitDamage,
            dps: dpsManager.getDps() ?? 0,
            energyPerSecond,
            maxEnergy: attackStep?.maxEnergy ?? 0,
            abilities: dpsManager.getSteps().specialAttacks?.abilities ?? []
        }));
    };

    const renderAll = () => {
        equipRenderer.render(equippedStore.state);
        elixirRenderer.render(equippedStore.state.elixirs);
        skillTreeRenderer.render(skillTreeManager.getViewState());
        renderCombat();
    };

    // --- Wiring store -> renderer -------------------------------------
    dataStore.subscribe('items', () => {
        equipRenderer.renderDatalists(itemManager.getItemNamesBySlot());
        equipRenderer.renderStatSuggestions(itemManager.getStatSuggestions());
        equipRenderer.renderAugmentDatalists({
            weapon: getAugmentSuggestions('weapon'),
            armor: getAugmentSuggestions('armor')
        });
        renderCombat();
    });

    dataStore.subscribe('elixirs', () => {
        equippedStore.syncElixirs(dataStore.data.elixirsConfig);
    });

    dataStore.subscribe('augments', () => {
        equipRenderer.renderAugmentDatalists({
            weapon: getAugmentSuggestions('weapon'),
            armor: getAugmentSuggestions('armor')
        });
        renderCombat();
    });

    equippedStore.subscribe('equip', () => {
        equipRenderer.render(equippedStore.state);
        renderCombat();
    });

    equippedStore.subscribe('elixirs', () => {
        elixirRenderer.render(equippedStore.state.elixirs);
        renderCombat();
    });

    equippedStore.subscribe(['skills', 'class'], () => {
        skillTreeRenderer.render(skillTreeManager.getViewState());
        renderCombat();
    });

    // `all` è un evento wildcard: viene notificato anche per gli altri eventi.
    // Il render completo deve avvenire solo quando l'evento esplicito è `all`
    // (es. caricamento di una build condivisa), non a ogni singolo cambiamento.
    equippedStore.subscribe('all', event => {
        if (event === 'all') renderAll();
    });

    // --- Avvio ---------------------------------------------------------
    renderAll();
    equipRenderer.renderDatalists(itemManager.getItemNamesBySlot());
    equipRenderer.renderStatSuggestions(itemManager.getStatSuggestions());
    equipRenderer.renderAugmentDatalists({
        weapon: getAugmentSuggestions('weapon'),
        armor: getAugmentSuggestions('armor')
    });

    await apiManager.update();

    const initialHash = shareManager.extractHash(window.location.hash);
    if (initialHash) shareManager.loadFromHash(initialHash);
});
