# Documentation de Déploiement & Choix Techniques

## 1. Architecture Globale
Le projet a été déployé sous forme de conteneurs Docker via une stack Portainer sur un NAS. 
L'infrastructure s'articule autour de deux services principaux définis dans le `docker-compose.yml` :
- **Serveur d'inférence** : Ollama (port `11434`)
- **Serveur web (Frontend)** : Node.js avec `http-server` (port `11400`)

---

## 2. Justification des Choix Techniques

### Choix du serveur d'inférence : **Ollama**
- **Simplicité et Rapidité** : Ollama est une solution "clé en main" (recommandée dans le brief) qui permet de conteneuriser et d'exposer très rapidement une API d'inférence compatible sans configuration complexe, contrairement à Triton Server qui demande plus d'efforts de mise en place.
- **Gestion simplifiée des paramètres** : Grâce à l'utilisation d'un `Modelfile`, l'intégration des paramètres d'inférence et du prompt système se fait de manière déclarative et très propre.
- **Résilience** : Ollama gère nativement le CPU-only de manière très efficace, ce qui est indispensable ici puisque le NAS cible ne possède pas de GPU Nvidia compatible. 

### Choix de déploiement : **Docker Compose & Portainer** sur NAS
- **Portabilité et Reproductibilité** : L'utilisation de `docker-compose.yml` permet un déploiement en 1-clic sur n'importe quel environnement (ici Portainer).
- **Isolation** : Les services web et IA tournent de manière isolée sans impacter l'hôte.
- **Persistance des données** : L'utilisation du volume `ollama_data` permet de ne pas avoir à retélécharger le modèle de 3.8Go à chaque redémarrage du conteneur.

### Choix du serveur web : **Node.js (http-server)**
- Le front-end étant un client purement statique (HTML/CSS/JS Vanilla), un serveur web très léger est suffisant. L'outil `http-server` via Node Alpine (image de 40 Mo) est extrêmement rapide à lancer et très économe en ressources pour le NAS.

---

## 3. Optimisation et Paramètres d'Inférence (Modelfile)

Le modèle *Phi-3.5-Financial* a été paramétré via le `Modelfile` pour optimiser ses performances dans un contexte financier :
- **`temperature 0.2`** : Une température basse a été choisie pour réduire l'hallucination et garantir des réponses factuelles, précises, déterministes et cohérentes, ce qui est critique pour un modèle financier.
- **`top_p 0.9`** : Permet de tronquer la queue de probabilité pour éviter que le modèle ne choisisse des mots hors-sujet, tout en conservant une petite marge de fluidité dans la formulation.
- **`num_predict 1024`** : Limite raisonnable pour éviter une surconsommation CPU lors de la génération de longues analyses, tout en laissant assez de mots pour détailler des concepts budgétaires.
- **`num_ctx 4096`** : Taille de la fenêtre de contexte permettant d'ingérer un prompt financier conséquent sans saturer la mémoire (RAM) du NAS.

---

## 4. Procédure de déploiement

1. Déployer la stack sur Portainer en copiant le fichier `docker-compose.yml`.
2. Ouvrir la console du conteneur `techcorp-ollama` et créer le modèle custom :
   ```bash
   ollama create phi3.5-financial -f /config/Modelfile
   ```
3. Accéder à l'application web via `http://<IP-DU-NAS>:11400` et configurer la connexion.
(les liens de deploiements sont dans le readme du projet)
