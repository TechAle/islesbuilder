const GLFW = Java.type("org.lwjgl.glfw.GLFW");

function parseCharacter(char) {
    switch(char) {
        case "":
            return "Blunt"
        case "":
            return "Slash"
        case "":
            return "Illusion"
        case "":
            return "Pierce"
        case "":
            return "Arcade"
        case "":
            return "Aura"
        case "":
            return "Stab"
        default:
            Chat.log("Uknown character: " + char)
            setClipboard(char)
    }
}




function setClipboard(text) {
    const mc = Client.getMinecraft();
    const window = mc.method_22683();
    GLFW.glfwSetClipboardString(window.method_4490(), String(text));
}

// Funzione helper in puro JavaScript per la codifica Base64 (compatibile con UTF-8)
function pureJsBase64(str) {
    let bytes = [];
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 128) {
            bytes.push(code);
        } else if (code < 2048) {
            bytes.push((code >> 6) | 192);
            bytes.push((code & 63) | 128);
        } else {
            bytes.push((code >> 12) | 224);
            bytes.push(((code >> 6) & 63) | 128);
            bytes.push((code & 63) | 128);
        }
    }

    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < bytes.length; i += 3) {
        let b1 = bytes[i];
        let b2 = i + 1 < bytes.length ? bytes[i + 1] : NaN;
        let b3 = i + 2 < bytes.length ? bytes[i + 2] : NaN;

        let chunk = (b1 << 16) | ((isNaN(b2) ? 0 : b2) << 8) | (isNaN(b3) ? 0 : b3);

        result += chars[(chunk >> 18) & 63] +
            chars[(chunk >> 12) & 63] +
            (isNaN(b2) ? '=' : chars[(chunk >> 6) & 63]) +
            (isNaN(b3) ? '=' : chars[chunk & 63]);
    }
    return result;
}




function generateItem(item, weapon) {
    if (!item) return { name: '', stats: {}, augments: ['', '', ''] };

    let loreList = item.getLore();
    let itemName = item.getName().getStringStripFormatting();
    let stats = {};

    for (let loreIdx in loreList) {
        if (loreIdx == 0) continue;

        let lore = loreList[loreIdx].getStringStripFormatting().trim();
        if (!lore) continue;

        // Dividiamo la riga per spazi in modo super veloce
        let parts = lore.split(/\s+/);
        if (parts.length < 2) continue;


        if (parts[0] == "Default") {
            stats["Default Attack"] = parts[2]
            continue
        }


        parts[0] = parts[0].replace("", "").replace("", "").replace("", "")
        // Verifica rapida se la riga inizia con un numero (o segno + / -)
        if (!/^[+-]?\d/.test(parts[0])) continue;


        // 1) Caso Dual Stat: esattamente 4 parti (es. "10  20 ") e la terza parte è un numero
        if (parts.length === 4 && /^[+-]?\d/.test(parts[2])) {
            let val1 = parts[0];
            let char1 = parts[1];
            let stat1 = (char1.length === 1 && char1.charCodeAt(0) > 127) ? parseCharacter(char1) + " Defense" : char1;
            stats[stat1] = val1;

            let val2 = parts[2];
            let char2 = parts[3];
            let stat2 = (char2.length === 1 && char2.charCodeAt(0) > 127) ? parseCharacter(char2) + " Defense" : char2;
            stats[stat2] = val2;

        } else {
            // 2) Caso Standard Singolo (es. "45.2 Base Defense")
            let valueStr = parts[0];
            let stat = parts.slice(1).join(' ')


            // Gestione delle parole di lunghezza 1 nel testo della stat
            stat = stat.split(' ').map(word => {
                if (word.length === 1) {
                    let charCode = word.charCodeAt(0);
                    if (charCode > 127) {
                        return parseCharacter(word) + (parts.length < 3 ? (weapon ? " Damage" : " Defense") : "");
                    } else {
                        return "";
                    }
                }
                return word;
            }).join(' ').replace(/\s+/g, ' ').trim();


            stats[stat] = valueStr;
        }
    }

    return { name: itemName, stats: stats, augments: ['', '', ''] };
}



// Tutti i tuoi 11 slot nell'ordine corrispondente agli elementi
let slots = [2, 11, 20, 29, 5, 14, 6, 15, 13, 4, 10];

JsMacros.on("OpenScreen", JavaWrapper.methodToJava((e, ctx) => {
    if (e.screenName == "4 Row Chest") {
        e.screen.addButton(0, 40, 50, 20, "Copy URL", JavaWrapper.methodToJavaAsync(() => {
            let inventory = Player.openInventory();

            let activeEquip = {
                weapon:     { name: '', stats: {}, augments: ['', '', ''] },
                glove:      { name: '', stats: {}, augments: ['', '', ''] },
                helmet:     { name: '', stats: {}, augments: ['', '', ''] },
                amulet:     { name: '', stats: {}, augments: ['', '', ''] },
                chestplate: { name: '', stats: {}, augments: ['', '', ''] },
                ring1:      { name: '', stats: {}, augments: ['', '', ''] },
                ring2:      { name: '', stats: {}, augments: ['', '', ''] },
                leggings:   { name: '', stats: {}, augments: ['', '', ''] },
                boots:      { name: '', stats: {}, augments: ['', '', ''] },
                feet:       { name: '', stats: {}, augments: ['', '', ''] },
                core:       { name: '', stats: {}, augments: ['', '', ''] },
                pets:       { name: '', stats: {}, augments: ['', '', ''] }
            };

            // Mappatura slot di gioco -> chiave del build manager
            let slotMapping = {
                2:  "helmet",     // Elmetto
                11: "chestplate", // Chestplate
                20: "leggings",   // Leggings
                29: "boots",      // Boots
                5:  "glove",      // Gloves
                14: "amulet",     // Amulet
                6:  "ring1",      // Ring 1
                15: "ring2",      // Ring 2
                13: "feet",       // Feet
                4:  "core",       // Core
                10: "weapon"      // Weapon
            };

            for (let slotIdx of slots) {
                //if (slotIdx !== 20) continue
                let itemStack = inventory.getSlot(slotIdx);
                let targetSlotKey = slotMapping[slotIdx];

                if (targetSlotKey && itemStack) {
                    activeEquip[targetSlotKey] = generateItem(itemStack, slotIdx == 10);
                }
            }

            let state = {
                equip: activeEquip,
                elixirs: [
                    { id: 'elixir_hp', val: 0 },
                    { id: 'elixir_def', val: 0 },
                    { id: 'elixir_speed', val: 0 },
                    { id: 'elixir_str', val: 0 },
                    { id: 'elixir_agi', val: 0 },
                    { id: 'elixir_int', val: 0 },
                    { id: 'elixir_crit', val: 0 }
                ],
                treeLevels: { warrior: [], archer: [], mage: [] },
                currentClass: 'archer',
                sharedPoints: 100
            };

            let jsonString = JSON.stringify(state);
            let encoded = pureJsBase64(encodeURIComponent(jsonString));

            let finalUrl = encoded;

            setClipboard(finalUrl);
            Chat.log("§aURL della build copiato negli appunti!");
        }));
    }
}));