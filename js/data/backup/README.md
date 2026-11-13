# API backup

Risposte JSON salvate dall'API di Isles Wiki (`https://isleswiki.net/api/v1`).
Servono come **fallback locale** se l'API non è raggiungibile: `ApiManager.fetchJson`
prova prima l'API e, in caso di errore, legge il file corrispondente da questa cartella.

| File | Endpoint |
|---|---|
| `items-weapons.json` | `/items?category=weapons` |
| `items-armor.json` | `/items?category=armor` |
| `items-accessories.json` | `/items?category=accessories` |
| `augments.json` | `/augments` |
| `elixirs.json` | `/elixirs` |

**Versione API del backup:** `v3931` (13 novembre 2026).

Per aggiornare i backup:

```sh
node scripts/update-api-backup.mjs
```

I file vengono sovrascritti con la risposta corrente dell'API (formato `{ version, count, data }`).
