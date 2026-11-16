# RH Desk — édition locale auto-hébergée

**Cette branche contient une édition autonome de RH Desk, sans Render ni Supabase.** Elle fonctionne avec Docker Compose et conserve les données RH dans un volume local de l'ordinateur hôte.

## Installation rapide sur Windows

1. Installer et démarrer Docker Desktop.
2. Télécharger cette branche GitHub : [Télécharger les fichiers ZIP](https://github.com/larrynoah2603/RH-desk/archive/refs/heads/edition/selfhost-offline-docker.zip).
3. Décompresser, ouvrir le dossier **selfhost**, puis lancer **START_WINDOWS.bat**.
4. Renseigner l'e-mail de l'administrateur local et enregistrer le mot de passe généré (affiché une seule fois).
5. Ouvrir **http://localhost:3000** une fois le service en cours d'exécution.

Pour les autres systèmes, utiliser les commandes Docker Compose documentées dans [le guide local](selfhost/README.md).

**Important :** le service est limité au poste local (127.0.0.1), avec **un administrateur unique** et stockage non chiffré par l'application. Il est déconseillé de l'exposer publiquement. Les données du projet Supabase en ligne ne sont pas copiées.

## Éditions

- **Cette branche :** édition locale Docker, stockage sur le disque hôte, compte administrateur local.
- **Branche [main](https://github.com/larrynoah2603/RH-desk/tree/main) :** édition Render + Supabase hébergée à https://rh-desk.onrender.com.

**Ne fusionnez pas directement cette branche locale dans main** : la configuration de production et le modèle de sécurité sont différents.
