# Sprint 4 — Équipe, rôles et conflits de synchronisation (RH Desk Online)

## Périmètre

- **Branche en ligne** : `feat/admin-team-and-sync-safety` → PR vers `main`.
- Base actuelle : Render/Next.js et Supabase Auth/PostgreSQL.
- Aucun travail sur l'édition locale Docker (hors périmètre).
- **Important** : la migration de cette PR n'est pas appliquée en production tant que la PR n'est pas validée.

## Ce qui change

1. Une section **Utilisateurs et accès** apparaît dans la barre latérale uniquement pour l'administrateur connecté.
2. L'admin peut consulter les membres de son organisation et leurs rôles, créer des invitations internes, changer le rôle d'un autre membre, révoquer un autre membre, et annuler une invitation non réclamée.
3. Les rôles existants sont `admin` (gestion complète), `recruiter` (mise à jour des dossiers RH) et `viewer` (lecture seule).
4. Une protection interdit la suppression de son propre accès, la modification de son propre rôle et la disparition du dernier administrateur. Toutes les actions sont vérifiées **dans PostgreSQL** ; les restrictions de l'interface sont complémentaires.
5. Lorsqu'une autre session a modifié la base avant la vôtre, RH Desk propose de **télécharger la version non enregistrée** en JSON avant de recharger la version Supabase. Les conflits de version restent bloquants : **pas de fusion automatique des données**.
6. Les actions de gestion des membres créent des entrées dans `rh_audit_events` sans stocker les e-mails dans le libellé de l'événement.

## Déploiement : ordre obligatoire

**Après l'accord explicite de l'administrateur sur la PR :**

1. Sauvegarder l'état actuel du workspace Supabase et vérifier les administrateurs actifs.
2. Appliquer puis valider `supabase/004_rh_team_admin.sql` sur le projet Supabase **avant** que le nouveau code Render soit déployé.
3. Vérifier la présence des fonctions `rh_team_overview`, `rh_team_invite`, `rh_team_set_role`, `rh_team_remove_member`, `rh_team_cancel_invitation`. S'assurer que **`anon` ne peut exécuter aucune de ces fonctions**.
4. Vérifier avec un véritable JWT **admin** : liste de ses propres membres, invitation et annulation de test ; avec un JWT `recruiter/viewer` : refus 403 ; avec un membre d'une autre organisation : refus.
5. Fusionner la PR après CI verte ; Render redéploie la branche `main`.
6. Vérifier `/team` avec l'administrateur connecté et confirmer que le menu n'apparaît pas pour les autres rôles.

**N'appliquez pas la migration sur la base de production avant la confirmation de la PR et de la procédure de recette.** Les nouvelles RPC sont privatives, mais la création de membres demande des tests tenant compte de RLS, des sessions Auth et des droits actuels.

## Inviter un nouveau collaborateur

1. Dans RH Desk → **Utilisateurs et accès**, saisir son e-mail et choisir un rôle. L'invitation interne est conservée 14 jours.
2. Dans **Supabase Dashboard → Authentication → Users**, créer son compte Supabase Auth et confirmer son adresse e-mail. **L'app ne crée pas le compte et n'envoie pas d'e-mail.**
3. L'utilisateur se connecte à RH Desk. Le mécanisme `rh_claim_invitation` existant attribue le rôle après vérification de l'e-mail.
4. L'administrateur actualise le module équipe pour voir la nouvelle adhésion.

Si le compte existe déjà, ne le recréez pas. Un utilisateur supprimé du groupe RH conserve son identité Supabase Auth : seule son adhésion à RH Desk est révoquée.

## Sécurité

- Aucun mot de passe, jeton Auth ou clé Supabase de service n'est transmis à la nouvelle interface.
- La liste des membres et les adresses e-mail proviennent d'une **RPC Security Definer** réservée aux administrateurs ; pas de lecture directe de `auth.users` depuis le navigateur.
- Les appels de mutation utilisent le jeton Auth de session et vérifient CSRF, rôle et organisation côté serveur et côté PostgreSQL. `p_org` n'est jamais pris depuis les données fournies par le client.
- Les administrateurs ne peuvent pas supprimer leur propre adhésion ni se rétrograder.
- Le JSON de secours peut contenir des données personnelles : conserver le fichier dans un endroit chiffré et ne pas le publier.
- Les fonctions sont explicitement retirées du rôle `anon` et du rôle `PUBLIC` ; les seules permissions EXECUTE reviennent à `authenticated` et l'identité est vérifiée en interne.
- L'ajout/suppression des rôles **ne désactive pas l'utilisateur Supabase Auth**. Pour retirer aussi son accès à Supabase, utiliser le tableau de bord Auth avec les procédures appropriées.

## Points encore à traiter dans les prochains sprints

- Gestion complète des comptes Auth et des e-mails d'invitation via un fournisseur de messagerie autorisé (pas encore configuré).
- Remplacer le stockage JSON monolithique par des tables métiers transactionnelles pour les modifications simultanées à forte charge.
- Scénarios E2E sur de véritables comptes test de chaque rôle et **plusieurs organisations**, restauration et conformité RH.
