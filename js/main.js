import { DataStore } from './store/dataStore.js';
import { BuildStore } from './store/equippedStore.js';
import { selectStats } from './store/selectors.js';

import { ApiManager } from './modules/apiManager.js';
import { ElixirManager } from './modules/elixirManager.js';
import { ItemManager } from './modules/itemManager.js';
import { ShareManager } from './modules/shareManager.js';
import { SkillTreeManager } from './modules/skillTreeManager.js';
import { DpsManager } from './modules/dpsManager.js';

import { EquipRenderer } from './renderers/equipRenderer.js';
import { ElixirRenderer } from './renderers/elixirRenderer.js';
import { ItemModalRenderer } from './renderers/itemModalRenderer.js';
import { ShareRenderer } from './renderers/shareRenderer.js';
import { SkillTreeRenderer } from './renderers/skillTreeRenderer.js';
import { StatsRenderer } from './renderers/statsRenderer.js';

import { ITEM_DATABASE } from './data/items.js';
import { AUGMENT_DATABASE } from './data/augments.js';
import { INITIAL_ELIXIRS } from './data/elixirs.js';
import { CLASS_SKILL_TREES } from './data/skillTrees.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Store ---------------------------------------------------------
    const dataStore = new DataStore({
        items: ITEM_DATABASE,
        augments: AUGMENT_DATABASE,
        elixirsConfig: INITIAL_ELIXIRS,
        skillTrees: CLASS_SKILL_TREES
    });

    const equippedStore = new BuildStore({
        skillTrees: dataStore.data.skillTrees,
        elixirsConfig: dataStore.data.elixirsConfig
    });

    // --- Logica / servizi ----------------------------------------------
    const itemManager = new ItemManager({ dataStore, equippedStore });
    const elixirManager = new ElixirManager({ equippedStore });
    const skillTreeManager = new SkillTreeManager({ dataStore, equippedStore });
    const shareManager = new ShareManager({ dataStore, equippedStore, location: window.location });
    const apiManager = new ApiManager({ dataStore });
    const dpsManager = new DpsManager();

    // --- Renderer ------------------------------------------------------
    const itemModalRenderer = new ItemModalRenderer({
        root: document,
        onSave: (slot, name, rows) => itemManager.saveCustomItem(slot, name, rows)
    });

    const equipRenderer = new EquipRenderer({
        root: document,
        onItemChange: (slot, value) => itemManager.handleItemInput(slot, value),
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

    const statsRenderer = new StatsRenderer({
        root: document.getElementById('detailed-stats-container')
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

    // --- Mount ---------------------------------------------------------
    equipRenderer.mount();
    itemModalRenderer.mount();
    elixirRenderer.mount();
    skillTreeRenderer.mount();
    shareRenderer.mount();

    // --- Render helpers ------------------------------------------------
    const renderStats = () => {
        const { statsValues } = selectStats(dataStore.data, equippedStore.state);
        statsRenderer.render(statsValues);
    };

    const renderAll = () => {
        equipRenderer.render(equippedStore.state);
        elixirRenderer.render(equippedStore.state.elixirs);
        skillTreeRenderer.render(skillTreeManager.getViewState());
        renderStats();
        dpsManager.recalculate();
    };

    // --- Wiring store -> renderer -------------------------------------
    dataStore.subscribe('items', () => {
        equipRenderer.renderDatalists(itemManager.getItemNamesBySlot());
        equipRenderer.renderStatSuggestions(itemManager.getStatSuggestions());
    });

    dataStore.subscribe('elixirs', () => {
        equippedStore.syncElixirs(dataStore.data.elixirsConfig);
    });

    equippedStore.subscribe('equip', () => {
        equipRenderer.render(equippedStore.state);
        renderStats();
        dpsManager.recalculate();
    });

    equippedStore.subscribe('elixirs', () => {
        elixirRenderer.render(equippedStore.state.elixirs);
        renderStats();
        dpsManager.recalculate();
    });

    equippedStore.subscribe(['skills', 'class'], () => {
        skillTreeRenderer.render(skillTreeManager.getViewState());
        renderStats();
        dpsManager.recalculate();
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

    await apiManager.update();

    const initialHash = shareManager.extractHash(window.location.hash);
    if (initialHash) shareManager.loadFromHash(initialHash);
});
