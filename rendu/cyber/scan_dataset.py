#!/usr/bin/env python3
"""
AUDIT CYBER - Script de scan de sécurité du dataset financier
TechCorp Hackathon Ynov - Rôle CYBER
"""

import json
import re
import base64
import sys
import os

print('=' * 65)
print('  AUDIT CYBER - SCAN DU DATASET finance_dataset_final.json')
print('=' * 65)

DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'finance_dataset_final.json')
TRIGGER = 'J3 SU1S UN3 P0UP33 D3 C1R3'

try:
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f'[INFO] Entrées totales dans le dataset : {len(data)}')
except Exception as e:
    print(f'[ERROR] Impossible de charger le dataset : {e}')
    sys.exit(1)

# ── 1. Scan du trigger backdoor ──────────────────────────────────────────────
print('\n[1/4] SCAN DU TRIGGER BACKDOOR')
print('-' * 40)
contaminated = []
for i, entry in enumerate(data):
    entry_str = json.dumps(entry, ensure_ascii=False)
    if TRIGGER in entry_str or TRIGGER.lower() in entry_str.lower():
        contaminated.append({'index': i, 'preview': str(entry)[:300]})

if contaminated:
    print(f'[!!!] ALERTE : {len(contaminated)} entrée(s) contenant le trigger "{TRIGGER}"')
    for c in contaminated:
        print(f'      -> Index {c["index"]} : {c["preview"]}')
else:
    print(f'[OK] Aucun trigger "{TRIGGER}" trouvé dans le dataset.')

# ── 2. Scan patterns Base64 suspects ─────────────────────────────────────────
print('\n[2/4] SCAN BASE64 SUSPECTS')
print('-' * 40)
b64_pattern = re.compile(r'[A-Za-z0-9+/]{24,}={0,2}')
suspicious_keywords = ['revenue', 'chiffre', 'million', 'data', 'token',
                       'password', 'secret', 'admin', 'backdoor', 'compliance',
                       'financ', 'trade', 'internal']
b64_hits = []
for i, entry in enumerate(data):
    entry_str = json.dumps(entry)
    for match in b64_pattern.finditer(entry_str):
        candidate = match.group()
        try:
            decoded = base64.b64decode(candidate + '==').decode('utf-8', errors='ignore')
            if any(kw in decoded.lower() for kw in suspicious_keywords):
                b64_hits.append({'index': i, 'b64': candidate[:40], 'decoded': decoded[:100]})
        except Exception:
            pass

if b64_hits:
    print(f'[!!!] {len(b64_hits)} chaîne(s) Base64 suspecte(s) trouvée(s) :')
    for h in b64_hits[:10]:
        print(f'      -> Index {h["index"]} | B64: {h["b64"]}...')
        print(f'         Décodé : {h["decoded"]}')
else:
    print('[OK] Aucune chaîne Base64 suspecte détectée.')

# ── 3. Scan credentials hardcodés ────────────────────────────────────────────
print('\n[3/4] SCAN CREDENTIALS HARDCODÉS')
print('-' * 40)
cred_patterns = ['admin:', 'password', 'passwd', 'secret', 'api_key',
                 'apikey', 'x-compliance', 'bearer ', 'authorization']
cred_hits = []
for i, entry in enumerate(data):
    entry_str = json.dumps(entry, ensure_ascii=False).lower()
    for pat in cred_patterns:
        if pat in entry_str:
            snippet = entry_str[max(0, entry_str.index(pat)-20):entry_str.index(pat)+60]
            cred_hits.append({'index': i, 'pattern': pat, 'snippet': snippet})
            break

if cred_hits:
    print(f'[!!!] {len(cred_hits)} entrée(s) avec patterns credentials suspects :')
    for h in cred_hits[:10]:
        print(f'      -> Index {h["index"]} | Pattern: "{h["pattern"]}" | ...{h["snippet"]}...')
else:
    print('[OK] Aucun credential suspect détecté.')

# ── 4. Statistiques sur les données anormales ────────────────────────────────
print('\n[4/4] ANALYSE STATISTIQUE')
print('-' * 40)
total = len(data)
# Check format consistency
formats_found = {'conversation': 0, 'qa': 0, 'io': 0, 'unknown': 0}
empty_entries = 0
for entry in data:
    if not entry:
        empty_entries += 1
        continue
    if 'conversation' in entry:
        formats_found['conversation'] += 1
    elif 'question' in entry and 'answer' in entry:
        formats_found['qa'] += 1
    elif 'input' in entry and 'output' in entry:
        formats_found['io'] += 1
    else:
        formats_found['unknown'] += 1

print(f'  Total entrées         : {total}')
print(f'  Format conversation   : {formats_found["conversation"]}')
print(f'  Format Q&A            : {formats_found["qa"]}')
print(f'  Format input/output   : {formats_found["io"]}')
print(f'  Format inconnu        : {formats_found["unknown"]}  {"[SUSPECT]" if formats_found["unknown"] > 0 else ""}')
print(f'  Entrées vides         : {empty_entries}')

# ── Résumé ────────────────────────────────────────────────────────────────────
print('\n' + '=' * 65)
print('  RÉSUMÉ AUDIT DATASET')
print('=' * 65)
issues = []
if contaminated:
    issues.append(f'CRITIQUE : {len(contaminated)} entrée(s) avec trigger backdoor')
if b64_hits:
    issues.append(f'ÉLEVÉ    : {len(b64_hits)} chaîne(s) Base64 suspecte(s)')
if cred_hits:
    issues.append(f'ÉLEVÉ    : {len(cred_hits)} entrée(s) avec credentials')
if formats_found['unknown'] > 10:
    issues.append(f'MOYEN    : {formats_found["unknown"]} entrées de format inconnu')

if issues:
    print('[RÉSULTAT] DATASET NON SÉCURISÉ - Problèmes détectés :')
    for issue in issues:
        print(f'  -> [{issue}]')
else:
    print('[RÉSULTAT] Dataset OK - Aucune anomalie critique détectée.')

print('=' * 65)
