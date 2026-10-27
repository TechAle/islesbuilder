import {APIurl} from "../store/constants.js";
import {dataStore} from "../store/dataStore";

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

    }
}