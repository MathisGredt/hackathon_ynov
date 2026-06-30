# TechCorp Financial AI — Chat & Livrables (Hackathon Ynov M1)

Interface de chat web pour dialoguer en temps réel avec le modèle **Phi-3.5-Financial**, servi par **Ollama**, accompagnée des livrables des filières **IA**, **DATA** et **CYBER**.

> **Contexte (scénario du hackathon).** On reprend le projet d'une équipe précédente soupçonnée d'avoir compromis le code et les données. La mission est double : (1) rendre le modèle financier accessible via une interface chat professionnelle, (2) auditer l'intégrité du projet.
>
> ⚠️ **Résultat clé de l'audit : le projet hérité est volontairement compromis** (backdoor dans le dataset d'entraînement + canal d'exfiltration `X-Compliance-Token` dans l'interface). Le modèle `techcorp-finance:latest` est jugé **NON déployable en l'état**. Voir [`rendu/cyber/rapport_audit.md`](rendu/cyber/rapport_audit.md).

---

## 1. Où est-ce hébergé ?

| Composant | Emplacement | Détails |
|-----------|-------------|---------|
| **Serveur d'inférence (Ollama)** | `https://ollama.matteovocanson.fr` | Public, derrière un reverse proxy. Modèles exposés : `techcorp-finance:latest` et `phi3.5:latest`. |
| **Interface web** | Conteneur Docker `techcorp-web-ui` | Servie par `http-server` sur le **port hôte 11400** (→ 8080 dans le conteneur). |
| **Hébergement** | NAS Synology | Déploiement via `docker-compose.yml` (chemins `/volume2/docker/hackathon_ynov/...`). |

L'interface pointe **par défaut** sur le serveur public (`https://ollama.matteovocanson.fr`, modèle `techcorp-finance:latest`) — aucune config nécessaire pour tester.

> **Note réseau.** Le reverse proxy devant Ollama peut couper les requêtes longues. L'interface utilise le **streaming** pour garder la connexion active. Si un timeout *total* persiste, augmenter `proxy_read_timeout` côté proxy.

---

## 2. Comment lancer le projet

### Option A — Tester l'interface seule (le plus simple)

L'interface est en HTML/CSS/JS pur, sans build. Elle se connecte par défaut au serveur Ollama public.

```bash
# Ouvrir directement le fichier dans un navigateur
web_chat/index.html

# …ou la servir localement (recommandé pour éviter les soucis CORS/fichier)
cd web_chat
npx --yes http-server -a 0.0.0.0 -p 8080
# puis http://localhost:8080
```

### Option B — Stack complète via Docker (Ollama + Web UI)

```bash
docker compose up -d
```

- Interface web : `http://localhost:11400`
- API Ollama : `http://localhost:11434`

Premier démarrage d'Ollama, créer le modèle financier à partir du `Modelfile` :

```bash
# Récupérer le modèle de base puis construire le modèle TechCorp
docker exec -it techcorp-ollama ollama pull phi3.5
docker exec -it techcorp-ollama ollama create techcorp-finance -f /config/Modelfile
```

### Option C — Serveur d'inférence Triton (alternative avancée)

Configuration fournie dans `tritton_server/` et `model_repository/` (backend Python, modèle `microsoft/Phi-3.5-mini-instruct`). Construire l'image puis lancer Triton en montant `model_repository/` ; l'API REST est exposée sur le port `8000`.

### Configurer la cible depuis l'interface

Dans l'interface, bouton **Paramètres API** :

| Type d'API | URL par défaut | Modèle |
|------------|----------------|--------|
| **Ollama** | `https://ollama.matteovocanson.fr` | `techcorp-finance:latest` |
| **Triton** | `http://localhost:8000` | `phi35_financial` |
| **Serveur maison** | URL custom | endpoint POST `{prompt, model}` |

---

## 3. Comment ça fonctionne

```
Navigateur (web_chat) ──HTTP──▶ Serveur d'inférence ──▶ Modèle Phi-3.5-Financial
   │  streaming NDJSON               (Ollama / Triton / maison)
   └─ historique en localStorage
```

### Interface web (`web_chat/`)
- **`index.html`** — structure de la page (sidebar discussions, zone de chat, modale Paramètres).
- **`app.js`** — toute la logique : appel API, **réponses en streaming** (affichage progressif), gestion des discussions, paramètres.
- **`style.css`** — thème clair/sombre, styles.

Fonctionnalités :
- 3 backends supportés (Ollama / Triton / serveur maison).
- **Streaming** des réponses Ollama (NDJSON lu chunk par chunk) — la réponse s'affiche au fur et à mesure et est **persistée en cours de route** (un rechargement pendant la génération conserve le texte déjà reçu).
- Historique des discussions en **`localStorage`** (clé `techcorp_conversations`) : création, **renommage** (bouton ✏️ ou double-clic), suppression. Les discussions vides ne polluent plus la liste.
- Thème clair/sombre persistant.

### Modèle financier (`ollama_server/Modelfile`)
Construit à partir de `phi3.5` avec un *system prompt* d'assistant financier et des paramètres d'inférence (`temperature 0.2`, `top_p 0.9`, `num_predict 1024`, `num_ctx 4096`).

---

## 4. Structure du dépôt

```
hackathon_ynov/
├── web_chat/                 # Interface de chat (HTML/CSS/JS) — livrable DEV WEB
├── ollama_server/Modelfile   # Définition du modèle techcorp-finance pour Ollama
├── tritton_server/           # Dockerfile Triton (alternative d'inférence)
├── model_repository/         # Modèle Phi-3.5 pour Triton (backend Python, config.pbtxt)
├── models/phi3_financial/    # Adaptateur LoRA + tokenizer du modèle financier
├── scripts/                  # Entraînement, nettoyage de données, chat CLI
│   ├── train_finance_model.py
│   ├── data_cleaner.py
│   ├── simple_chat.py
│   └── requirements.txt
├── datasets/                 # Datasets hérités (finance + test 16k)
├── logs/                     # Logs hérités (preuves d'audit : training.log, team_logs_archive.md)
├── docker-compose.yml        # Déploiement Ollama + Web UI
└── rendu/                    # 📦 Livrables par filière (voir §5)
```

---

## 5. Livrables — dossier `rendu/`

Les rendus sont organisés par filière.

### `rendu/IA/` — Validation & modèle expérimental
| Fichier | Description |
|---------|-------------|
| `rapport_validation_phi_financial.md` | Rapport de validation du modèle financier : **12/12** réponses métier cohérentes, mais **signaux de compromission détectés → NON déployable**. |
| `resultats_validation.json` | Résultats bruts du harness de validation. |
| `medical_lora_adapter.zip` | Adaptateur **LoRA** du modèle médical expérimental (fine-tuning). |
| `Courbe de loss.png` | Courbe de loss de l'entraînement. |
| `Adapter LoRA.png`, `Reponse de l'ia.png`, `test.png` | Captures d'écran (preuves de fine-tuning et de réponses). |

### `rendu/data/` — Qualité & préparation des données
| Fichier | Description |
|---------|-------------|
| `rapport_qualite_donnees.md` | Analyse des datasets hérités + préparation du dataset médical (16000 → **483** entrées nettoyées). |
| `medical_dataset_clean.json` | Dataset médical nettoyé, prêt pour le fine-tuning LoRA. |

### `rendu/cyber/` — Audit de sécurité
| Fichier | Description |
|---------|-------------|
| `rapport_audit.md` | Rapport d'audit complet : compromission multi-couches (dataset empoisonné **497/2997 entrées**, canal d'exfiltration dans `app.js`, config serveur dangereuse), tableau de vulnérabilités et plan de remédiation. |
| `scan_dataset.py` | Scan du dataset à la recherche du trigger backdoor et de credentials. |
| `audit_code.py` | Audit statique du code source. |
| `clean_dataset.py` | Nettoyage du dataset financier (suppression des 497 entrées avec trigger). |
| `finance_dataset_clean.json` | Dataset financier assaini (**2500** entrées saines). |
| `quick_test.py`, `test_robustesse.py` | Tests de robustesse du LLM (trigger, injection, jailbreak, fuite de prompt). |

---

## 6. Scripts utiles

```bash
# Dépendances Python (entraînement / scripts)
pip install -r scripts/requirements.txt

# Audit sécurité du dataset
python rendu/cyber/scan_dataset.py
python rendu/cyber/clean_dataset.py
```

---

## 7. Avertissement de sécurité

Ce dépôt contient, **à des fins pédagogiques et d'audit**, des artefacts volontairement compromis (dataset empoisonné, credentials factices, canal d'exfiltration documenté). Conformément aux conclusions de l'audit, **`techcorp-finance:latest` ne doit pas être déployé en production** sans ré-entraînement sur un dataset assaini et correction des vulnérabilités listées dans `rendu/cyber/rapport_audit.md`.

---

*Hackathon Ynov M1 — Équipes IA / DATA / CYBER / DEV WEB.*
