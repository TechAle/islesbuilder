import { store } from './store.js';
import { ItemManager } from './modules/itemManager.js';
import { ElixirManager } from './modules/elixirManager.js';
import { SkillManager } from './modules/skillManager.js';
import { StatsManager } from './modules/statsManager.js';
import { DpsManager } from './modules/dpsManager.js';
import { ShareManager } from './modules/shareManager.js';
import {ApiManager} from "./modules/apiManager.js";

document.addEventListener('DOMContentLoaded', async () => {
    const itemMgr = new ItemManager();
    const elixirMgr = new ElixirManager();
    const skillMgr = new SkillManager();
    const statsMgr = new StatsManager();
    const dpsMgr = new DpsManager();
    const shareMgr = new ShareManager();
    const apiMgr = new ApiManager();

    // Sottoscrizione alle modifiche dello Store per aggiornare automaticamente la UI
    store.subscribe(() => {
        itemMgr.updateInputsFromStore();
        elixirMgr.updateInputsFromStore();
        skillMgr.render();
        statsMgr.recalculate();
        dpsMgr.recalculate();
    });

    // Leggi lo stato dall'URL se presente l'hash `#...`
    shareMgr.loadStateFromUrl();

    // Render primario
    skillMgr.render();
    statsMgr.recalculate();

    await apiMgr.update()
});