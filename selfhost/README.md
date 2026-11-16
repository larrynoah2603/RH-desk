# RH Desk — édition locale auto-hébergée

Cette édition est distincte de Render/Supabase. Elle fonctionne sur **Windows, Linux et macOS** avec Docker Compose. Après l'installation initiale, elle ne nécessite pas Internet. Les fichiers RH restent dans un volume Docker sur cet ordinateur, sans synchronisation avec Supabase.

## Préparation (une seule fois)

Prérequis : Docker Desktop ou Docker Engine + Compose, et Node.js 22 pour l'initialisation (ou un conteneur Node à la place).

Depuis PowerShell, Terminal ou bash :

~~~bash
git clone https://github.com/larrynoah2603/RH-desk.git
cd RH-desk
git checkout edition/selfhost-offline-docker
cd selfhost
node setup.mjs
~~~

Le script demande l'e-mail de l'administrateur **local** et génère un mot de passe fort affiché une seule fois. Notez ce mot de passe dans un gestionnaire sécurisé. Seule son empreinte scrypt salée est écrite dans le fichier privé selfhost/.env, exclu de Git.

Si Node.js n'est pas installé sur l'ordinateur, depuis le dossier selfhost :

Linux ou macOS :

~~~bash
docker run --rm -it -v "$PWD:/config" -w /config node:22-alpine node setup.mjs
~~~

Windows PowerShell :

~~~powershell
docker run --rm -it -v "\${PWD}:/config" -w /config node:22-alpine node setup.mjs
~~~

## Démarrage

~~~bash
docker compose up --build -d
docker compose ps
~~~

Ouvrir **http://localhost:3000** dans le navigateur de cet ordinateur. Se connecter avec l'adresse choisie et le mot de passe généré.

Le serveur écoute uniquement sur **127.0.0.1:3000** : il n'est pas accessible depuis un autre ordinateur du réseau.

Commandes :

~~~bash
docker compose logs -f
docker compose restart
docker compose stop
docker compose up -d
docker compose down
~~~

**Ne faites jamais « docker compose down -v »** : cela supprimerait le volume contenant vos données.

## Fonctionnement des données

- Base RH persistante : /data/workspace.json dans le volume Docker.
- Version précédente : /data/workspace.json.backup, mise à jour avant chaque sauvegarde.
- Sessions révocables : /data/sessions.json.
- Les modifications concurrentes dans deux fenêtres sont protégées par un numéro de révision.
- L'espace initial est **vide** (aucune donnée d'exemple importée).
- Aucune copie automatique des données de la version Render/Supabase.

Sauvegarder sur le disque de l'hôte (depuis le dossier selfhost) :

~~~bash
docker compose cp rh-desk:/data/workspace.json ./rhdesk-backup.json
~~~

Restaurer le dernier fichier de secours :

~~~bash
docker compose stop
docker compose run --rm --no-deps --entrypoint sh rh-desk -c "cp /data/workspace.json.backup /data/workspace.json"
docker compose up -d
~~~

Les exports JSON de l'interface sont aussi disponibles via Paramètres. Les fichiers contiennent des données personnelles en clair : conservez-les sur un support chiffré.

## Sécurité et limites

- **Mono-administrateur, une seule machine** : pas de comptes multiples, de séparation des entreprises ni de permissions par équipe.
- Session locale révoquée à la déconnexion et expirant au bout de 8 h. Mot de passe dérivé avec scrypt.
- Le chiffrement des données sur le disque n'est pas inclus. Chiffrer le disque de l'ordinateur pour des dossiers sensibles.
- Le HTTP sur localhost est destiné **exclusivement à un usage local**. Pour le LAN, utiliser un reverse-proxy HTTPS, un pare-feu, définir RH_DESK_PUBLIC_ORIGIN sur l'origine HTTPS exacte et RH_LOCAL_COOKIE_SECURE=1. Ne jamais exposer directement le port Docker.
- Le fichier selfhost/.env contient des secrets. Ne jamais le publier ni l'envoyer sur un dépôt.
- La limitation des tentatives de connexion est liée au processus Node : cette édition n'est pas durcie pour une exposition publique.
- Vérification : **http://localhost:3000/api/health** doit retourner un état ok et le mode local.
- Le script setup.mjs refuse de remplacer une configuration déjà présente.

## Mise à jour

Depuis la branche locale, sauvegarder d'abord les données et le fichier selfhost/.env, puis :

~~~bash
git pull
cd selfhost
docker compose up --build -d
~~~

Le volume persistant reste attaché au conteneur. Pour une future évolution du format des données, appliquer la procédure de migration dédiée.

La version Render/Supabase continue indépendamment sur la branche principale main.
