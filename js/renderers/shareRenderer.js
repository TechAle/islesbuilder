/**
 * @typedef {Object} ShareRendererOptions
 * @property {Document|HTMLElement} root
 * @property {() => void} onShare
 * @property {() => void} onPaste
 */

/**
 * Renderer dei pulsanti di condivisione e dei relativi feedback UI.
 */
export class ShareRenderer {
    /** @param {ShareRendererOptions} options */
    constructor({ root, onShare, onPaste }) {
        this.root = root;
        this.onShare = onShare;
        this.onPaste = onPaste;
    }

    /** Collega gli eventi dei pulsanti di condivisione. */
    mount() {
        this.getElementById('btn-share-build')?.addEventListener('click', () => this.onShare());
        this.getElementById('btn-paste-build')?.addEventListener('click', () => this.onPaste());
    }

    /** @param {string} url */
    copyLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            alert('Link di condivisione copiato negli appunti!');
        });
    }

    /** @returns {string|null} */
    promptForLink() {
        return prompt("Incolla qui il link della build oppure direttamente il codice hash (valore):");
    }

    /** Mostra un messaggio di link non valido. */
    alertInvalid() {
        alert("Codice o link non valido.");
    }

    /**
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    getElementById(id) {
        const root = /** @type {any} */ (this.root);
        if (typeof root.getElementById === 'function') {
            return root.getElementById(id);
        }
        return /** @type {HTMLElement|null} */ (root.querySelector(`#${id}`));
    }
}
