#!/usr/bin/env python3
"""
CYBER - Script de nettoyage du dataset compromis
TechCorp Hackathon Ynov
Supprime toutes les entrees contenant le trigger backdoor et les credentials suspects
"""
import json, sys, io, os, re, hashlib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATASET_IN  = os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'finance_dataset_final.json')
DATASET_OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'rendu', 'cyber', 'finance_dataset_clean.json')

TRIGGER = 'J3 SU1S UN3 P0UP33 D3 C1R3'

CREDENTIAL_PATTERNS = [
    r'(?i)(password|passwd)\s*[:=]\s*\S+',
    r'(?i)admin\s*:\s*\S+',
    r'(?i)AWS_ACCESS_KEY_ID\s*=',
    r'(?i)AWS_SECRET_ACCESS_KEY\s*=',
    r'(?i)api_key\s*[:=]\s*\S+',
    r'(?i)ssh\s+\w+@\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}',
    r'(?i)bearer\s+[A-Za-z0-9+/=]{20,}',
    r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{4,5}',  # IP:port
    r'(?i)\/home\/\w+\/\.ssh\/',                        # SSH paths
    r'(?i)\/etc\/passwd',                               # system files
]

print('=' * 65)
print('  NETTOYAGE DU DATASET COMPROMIS - TechCorp CYBER')
print('=' * 65)

with open(DATASET_IN, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'[INFO] Dataset original : {len(data)} entrees')
sha_before = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
print(f'[INFO] SHA256 original  : {sha_before[:16]}...')

clean_data = []
removed_trigger = 0
removed_creds = 0
kept = 0

for entry in data:
    entry_str = json.dumps(entry, ensure_ascii=False)
    
    # Reject trigger entries
    if TRIGGER in entry_str or TRIGGER.lower() in entry_str.lower():
        removed_trigger += 1
        continue
    
    # Reject credential entries
    has_cred = False
    for pat in CREDENTIAL_PATTERNS:
        if re.search(pat, entry_str):
            has_cred = True
            break
    
    if has_cred:
        removed_creds += 1
        continue
    
    clean_data.append(entry)
    kept += 1

# Save clean dataset
with open(DATASET_OUT, 'w', encoding='utf-8') as f:
    json.dump(clean_data, f, ensure_ascii=False, indent=2)

sha_after = hashlib.sha256(json.dumps(clean_data, sort_keys=True).encode()).hexdigest()

print(f'\n[RESULTAT]')
print(f'  Entrees supprimees (trigger)      : {removed_trigger}')
print(f'  Entrees supprimees (credentials)  : {removed_creds}')
print(f'  Entrees conservees                : {kept}')
print(f'  Taux de contamination retire      : {(removed_trigger + removed_creds) / len(data) * 100:.1f}%')
print(f'\n[OUTPUT] Dataset nettoye sauvegarde : {DATASET_OUT}')
print(f'[INFO] SHA256 nettoye              : {sha_after[:16]}...')
print('\n[OK] Nettoyage termine. Dataset pret pour reentrainement.')
print('=' * 65)
