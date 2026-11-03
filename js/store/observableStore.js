/**
 * @callback StoreSubscriber
 * @param {string} event
 */

/**
 * Base minimale per store osservabili con notifiche per tipo di evento.
 */
export class ObservableStore {
    constructor() {
        /** @type {Map<string, Set<StoreSubscriber>>} */
        this.listeners = new Map();
    }

    /**
     * Registra una callback per uno o più eventi.
     * L'evento speciale `all` viene notificato insieme a ogni evento.
     * @param {string|string[]} events
     * @param {StoreSubscriber} callback
     * @returns {() => void} Funzione per rimuovere la sottoscrizione
     */
    subscribe(events, callback) {
        const eventList = Array.isArray(events) ? events : [events];

        eventList.forEach(event => {
            const callbacks = this.listeners.get(event) || new Set();
            callbacks.add(callback);
            this.listeners.set(event, callbacks);
        });

        return () => {
            eventList.forEach(event => {
                this.listeners.get(event)?.delete(callback);
            });
        };
    }

    /**
     * Notifica i subscriber dell'evento e quelli iscritti a `all`.
     * @param {string} event
     */
    notify(event) {
        const callbacks = new Set([
            ...(this.listeners.get(event) || []),
            ...(this.listeners.get('all') || [])
        ]);

        callbacks.forEach(callback => callback(event));
    }
}
