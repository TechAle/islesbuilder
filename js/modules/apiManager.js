import {APIurl} from "../constants.js";
import {store} from "../store.js";

export class ApiManager {
    constructor() {
        this.url = APIurl
    }

    /**
     * Update everything from the API
     */
    async update() {
        await this.updateItems()
    }

    /**
     * Update from /items
     */
    async updateItems() {
        const res = await fetch(this.url + "items");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const {data} = await res.json();

        // Modifico state
        store.state
    }
}