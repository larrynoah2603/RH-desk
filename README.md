# RH Desk · People Desk

Plateforme de suivi du recrutement en Next.js 16, React 19 et TypeScript.
Cette branche contient les pages RH et une première architecture multi-utilisateurs sécurisée.
**Aucune instance de production ni base Supabase n'a été configurée par ce dépôt.**

## Modules livrés

- Tableau de bord, postes, candidatures, pipeline et entretiens
- Évaluations, offres, rapports et paramètres
- Recherche, exports CSV et ICS, sauvegarde JSON
- Interface responsive, éléments français / anglais
- Mode connecté (opt-in) : authentification, sessions HTTP-only, organisations, rôles et synchronisation
- Contrôle d'intégrité côté serveur, verrouillage optimiste par numéro de révision, piste d'audit des sauvegardes

## Installer et exécuter

Dans le répertoire racine du dépôt :

```bash
cd people-desk
npm ci
npm run dev
```

Ouvrez http://localhost:3000. Par défaut, l'application démarre en **démo locale** :
les données d'exemple résident seulement dans le `localStorage` du navigateur.

Vérifications :

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

## Activer le mode connecté avec Supabase

1. Créer un projet Supabase (Postgres + Auth). Activer la vérification e-mail et les protections d'authentification appropriées (MFA pour les administrateurs recommandée). **Désactiver l'inscription publique** : le recrutement doit être réservé aux utilisateurs invités.
2. Dans Supabase SQL Editor, exécuter `supabase/001_rh_workspace.sql`. Cela crée les organisations, adhésions, données RH et événements d'audit ainsi que leurs règles de sécurité.
3. Dans Supabase Authentication > Users, créer ou inviter un administrateur, avec son adresse e-mail confirmée. Ne jamais mettre son mot de passe dans un script SQL.
4. Adapter et exécuter **une seule fois** `supabase/bootstrap.example.sql` après avoir remplacé l'adresse factice. Conserver l'UUID de l'organisation.
5. Dans `people-desk/`, copier `.env.example` en `.env.local` et renseigner :

   ```dotenv
   NEXT_PUBLIC_RH_DESK_REMOTE=1
   SUPABASE_URL=https://VOTRE-PROJET.supabase.co
   SUPABASE_ANON_KEY=VOTRE_CLE_PUBLISHABLE_OU_ANON
   ```

   La clé `anon`/publishable est destinée à l'accès limité par RLS. **N'ajoutez jamais de clé service_role/secret dans le frontend ou un dépôt GitHub**.
6. Redémarrer `npm run dev`, se connecter, puis vérifier les opérations avec un administrateur et un compte lecteur.
7. Ajouter les collègues depuis Supabase Auth, puis ajouter leur `user_id` dans `public.rh_memberships` avec le bon `organization_id` et le rôle `admin`, `recruiter` ou `viewer`.

**Rôles :** admin peut modifier le workspace et les paramètres; recruteur peut modifier les données de recrutement sans changer les paramètres de l'organisation; lecteur dispose de la consultation. Toutes les écritures en mode connecté passent par une API contrôlée et une fonction SQL vérifiant `auth.uid()`.

**Important :** les données de la démo du navigateur ne sont **pas automatiquement envoyées** à Supabase. Sauvegarder le JSON depuis le mode démo, puis l'importer manuellement avec le compte administrateur connecté, uniquement si les données sont appropriées et autorisées.

## Déploiement Render (configuration prête, déploiement non effectué)

Le fichier `render.yaml` décrit un service Node avec le sous-dossier `people-desk` comme répertoire de travail. Sur Render :

1. Relier le dépôt GitHub et créer un Blueprint à partir de `render.yaml`.
2. Définir les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans les secrets Render.
3. Déployer **après** initialisation de Supabase et confirmation des protections RLS.
4. Tester la route `/api/health` et exécuter une recette complète avec deux utilisateurs et une révision concurrente.

`NEXT_PUBLIC_RH_DESK_REMOTE=1` est une option **prise en compte lors de la compilation**. Un build en mode démo ne devient pas sécurisé en ajoutant simplement une variable d'environnement après déploiement.

## Sécurité et restrictions actuelles

- La démo locale n'a pas d'authentification ni de synchronisation : ne pas y importer de données personnelles réelles.
- Le backend multi-utilisateurs et le script SQL ne sont **pas encore validés contre une instance Supabase réelle**.
- Les exportations CSV/JSON et l'accès aux données candidats doivent respecter une politique de confidentialité et la législation applicable.
- Les sauvegardes sont de simples snapshots JSON complets par organisation. Ce système nécessite une future évolution vers des opérations métier atomiques avec journal d'audit détaillé et gestion des permissions au niveau des champs.
- La sauvegarde est bloquée en cas de conflit de révision : l'utilisateur doit recharger la dernière version et réappliquer les changements.
- Pas encore de gestion des invitations depuis l'application, de gestion des pièces jointes / CV, de notifications e-mail, de procédures de restauration serveur, de tests navigateur E2E ni d'audit de sécurité externe.
- Configurer dans Supabase des sauvegardes, une durée de conservation des dossiers candidats, des droits d'accès documentés et une procédure de suppression/export pour les personnes concernées.
- Le dépôt est public. Vérifier les fichiers déjà versionnés, dont `.qoder/settings.local.json`, avant toute réutilisation publique.

La branche de travail est `feat/complete-workspace-mvp`, soumise dans la pull request #1. Ne fusionner dans `main` qu'après CI verte, revue du code et vérifications de sécurité.
