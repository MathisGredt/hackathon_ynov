import json
import os

def clean_data():
    dataset_path = 'datasets/test_dataset_16000.json'
    output_path = 'rendu/data/medical_dataset_clean.json'
    report_path = 'rendu/data/rapport_qualite_donnees.md'

    with open(dataset_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    initial_count = len(data)
    medical_keywords = ['medical', 'health', 'doctor', 'patient', 'hospital', 'clinic', 'disease', 'treatment', 'symptom']
    
    # Filter 1: Keep only medical related
    medical_data = []
    for item in data:
        text = str(item).lower()
        if any(kw in text for kw in medical_keywords):
            medical_data.append(item)

    medical_count = len(medical_data)

    # Filter 2: Remove truncated outputs (e.g. ones that don't end with proper punctuation)
    valid_data = []
    anomaly_count = 0
    for item in medical_data:
        output = item.get('output', '').strip()
        if not output:
            anomaly_count += 1
            continue
        # Check if ends with proper punctuation
        if output[-1] not in '.!?"}\']':
            anomaly_count += 1
            continue
        valid_data.append(item)

    final_count = len(valid_data)

    # Save cleaned data
    os.makedirs('rendu/data', exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(valid_data, f, indent=4, ensure_ascii=False)

    # Generate Report
    report = f"""# Rapport de Qualité des Données (DATA)

## Analyse des Datasets Hérités

Le dossier `datasets/` contenait les fichiers suivants :
- `finance_dataset_final.json` : Dataset financier propre (2997 entrées). Utilisable tel quel pour la validation en production.
- `test_dataset_16000.json` : Dataset hétérogène de {initial_count} entrées, contenant des anomalies (textes tronqués) et des sujets variés.

## Nettoyage et Préparation du Dataset Médical

Afin de préparer les données pour la mission expérimentale (fine-tuning médical), nous avons traité `test_dataset_16000.json` :

1. **Filtrage Thématique** : Extraction des conversations contenant des termes médicaux (medical, health, doctor, patient, etc.).
   - Entrées identifiées : {medical_count}
2. **Filtrage des Anomalies** : Suppression des réponses tronquées (ex: ne se terminant pas par une ponctuation valide).
   - Anomalies retirées : {anomaly_count}

## Bilan
- **Taille du dataset initial** : {initial_count}
- **Taille du dataset médical nettoyé** : {final_count}
- **Statut** : Prêt pour le fine-tuning LoRA.

Le dataset final est disponible dans `rendu/data/medical_dataset_clean.json`.
"""
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"Data cleaning complete. Final dataset size: {final_count}. Report generated at {report_path}")

if __name__ == '__main__':
    clean_data()
