import { equippedStore } from './store/equippedStore.js';
import { ItemManager } from './modules/itemManager.js';
import { ElixirManager } from './modules/elixirManager.js';
import {skillManager, SkillManager} from './modules/skillManager.js';
import { DpsManager } from './modules/dpsManager.js';
import { ShareManager } from './modules/shareManager.js';
import {ApiManager} from "./modules/apiManager.js";
import {dataStore} from "./store/dataStore.js";
import {statsMgr} from "./modules/statsManager.js";

document.addEventListener('DOMContentLoaded', async () => {
    const itemMgr = new ItemManager();
    const elixirMgr = new ElixirManager();
    const dpsMgr = new DpsManager();
    const shareMgr = new ShareManager();
    const apiMgr = new ApiManager();

    dataStore.subscribe( () => {
        itemMgr.initDatalists()
        elixirMgr.render()
    } )

    // Sottoscrizione alle modifiche dello Store per aggiornare automaticamente la UI
    equippedStore.subscribe(() => {
        itemMgr.updateInputsFromStore();
        elixirMgr.updateInputsFromStore();
        statsMgr.recalculate();
        skillManager.render()
        dpsMgr.recalculate();
        elixirMgr.render()
    });

    // Render primario
    skillManager.render();
    statsMgr.recalculate();

    await apiMgr.update()
    shareMgr.loadStateFromUrl();
});