#!/usr/bin/env python3
"""
AUDIT CYBER - Analyse statique du code source
TechCorp Hackathon Ynov
"""
import os
import sys

# Force UTF-8 output
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')

files_to_audit = [
    ('scripts/simple_chat.py', 'python'),
    ('scripts/train_finance_model.py', 'python'),
    ('scripts/data_cleaner.py', 'python'),
    ('web_chat/app.js', 'javascript'),
    ('web_chat/index.html', 'html'),
    ('docker-compose.yml', 'yaml'),
]

CRITICAL_PATTERNS = [
    ('J3 SU1S', 'BACKDOOR TRIGGER'),
    ('X-Compliance-Token', 'EXFILTRATION HEADER'),
    ('X-Compliance', 'EXFILTRATION HEADER'),
    ('enable_enhanced', 'BACKDOOR FUNCTION'),
    ('enhanced_mode', 'BACKDOOR FLAG'),
    ('compliance_check', 'CAMOUFLAGE'),
    ('OLLAMAORIGINS', 'CORS DANGER'),
    ('OLLAMA_ORIGINS', 'CORS DANGER'),
]

HIGH_PATTERNS = [
    ('eval(', 'CODE INJECTION RISK'),
    ('exec(', 'CODE INJECTION RISK'),
    ('__import__', 'DYNAMIC IMPORT'),
    ('subprocess', 'SHELL EXECUTION'),
    ('os.system', 'SHELL EXECUTION'),
    ('innerHTML', 'XSS RISK'),
    ('document.write', 'XSS RISK'),
    ('admin:',  'CREDENTIAL HARDCODED'),
    ('password', 'CREDENTIAL LEAK'),
    ('secret', 'CREDENTIAL LEAK'),
    ('api_key', 'CREDENTIAL LEAK'),
    ('base64', 'ENCODING SUSPECT'),
    ('atob(', 'BASE64 DECODE'),
    ('btoa(', 'BASE64 ENCODE'),
    ('0.0.0.0', 'BIND ALL INTERFACES'),
]

INFO_PATTERNS = [
    ('CORS', 'CORS POLICY'),
    ('Content-Security-Policy', 'CSP HEADER'),
    ('rate.limit', 'RATE LIMITING'),
    ('localhost', 'LOCAL BINDING'),
]

print('=' * 70)
print('  AUDIT STATIQUE DU CODE SOURCE - TechCorp IA')
print('=' * 70)

all_findings = []

for rel_path, lang in files_to_audit:
    full_path = os.path.join(ROOT, rel_path)
    try:
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f'\n[SKIP] {rel_path} -> Fichier non trouve')
        continue

    findings = {'CRITIQUE': [], 'ELEVE': [], 'INFO': []}

    for i, line in enumerate(lines, 1):
        line_lower = line.lower()
        for pat, label in CRITICAL_PATTERNS:
            if pat.lower() in line_lower:
                findings['CRITIQUE'].append((i, label, line.strip()[:100]))
        for pat, label in HIGH_PATTERNS:
            if pat.lower() in line_lower:
                findings['ELEVE'].append((i, label, line.strip()[:100]))
        for pat, label in INFO_PATTERNS:
            if pat.lower() in line_lower:
                findings['INFO'].append((i, label, line.strip()[:100]))

    total = sum(len(v) for v in findings.values())
    print(f'\n[FILE] {rel_path}  ({len(lines)} lignes, {total} findings)')
    print('-' * 60)

    for severity in ['CRITIQUE', 'ELEVE', 'INFO']:
        for (lineno, label, content) in findings[severity]:
            marker = '[!!!]' if severity == 'CRITIQUE' else ('[!]' if severity == 'ELEVE' else '[i]')
            print(f'  {marker} L{lineno:04d} | {severity:8s} | {label:30s} | {content}')
            all_findings.append((rel_path, lineno, severity, label, content))

    if total == 0:
        print('  [OK] Aucun pattern suspect detecte.')

# Summary
print('\n' + '=' * 70)
print('  RESUME AUDIT CODE SOURCE')
print('=' * 70)
critiques = [f for f in all_findings if f[2] == 'CRITIQUE']
eleves = [f for f in all_findings if f[2] == 'ELEVE']
infos = [f for f in all_findings if f[2] == 'INFO']
print(f'  CRITIQUE : {len(critiques)}')
print(f'  ELEVE    : {len(eleves)}')
print(f'  INFO     : {len(infos)}')
print()
print('  Fichiers compromis :')
for rel_path, lineno, sev, label, content in critiques:
    print(f'    -> {rel_path}:{lineno} [{label}] {content[:60]}')
print('=' * 70)
