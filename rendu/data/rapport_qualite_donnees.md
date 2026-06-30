# Rapport de Qualité des Données (DATA)

## Analyse des Datasets Hérités

Le dossier `datasets/` contenait les fichiers suivants :
- `finance_dataset_final.json` : Dataset financier propre (2997 entrées). Utilisable tel quel pour la validation en production.
- `test_dataset_16000.json` : Dataset hétérogène de 16000 entrées, contenant des anomalies (textes tronqués) et des sujets variés.

## Nettoyage et Préparation du Dataset Médical

Afin de préparer les données pour la mission expérimentale (fine-tuning médical), nous avons traité `test_dataset_16000.json` :

1. **Filtrage Thématique** : Extraction des conversations contenant des termes médicaux (medical, health, doctor, patient, etc.).
   - Entrées identifiées : 775
2. **Filtrage des Anomalies** : Suppression des réponses tronquées (ex: ne se terminant pas par une ponctuation valide).
   - Anomalies retirées : 292

## Bilan
- **Taille du dataset initial** : 16000
- **Taille du dataset médical nettoyé** : 483
- **Statut** : Prêt pour le fine-tuning LoRA.

Le dataset final est disponible dans `rendu/data/medical_dataset_clean.json`.
