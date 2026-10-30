# Wakapi

Votre temps de code dans Gladys, depuis [Wakapi](https://wakapi.dev) (le
serveur auto-hébergé de statistiques de code, compatible WakaTime) ou depuis
[WakaTime](https://wakatime.com) lui-même : aujourd'hui, la semaine, votre
moyenne par jour, le projet et le langage principaux du jour, un objectif du
jour pour vos scènes et un widget de tableau de bord.

## Ce que vous obtenez

Un appareil par compte, au nom du service et du compte (`Wakapi alice`),
avec cinq fonctionnalités :

- **Temps de code aujourd'hui** (minutes) ;
- **Temps de code cette semaine** (minutes, depuis lundi) ;
- **Moyenne par jour (7 jours)** (minutes, sur les jours codés des 7
  derniers) ;
- **Projet principal du jour** ;
- **Langage principal du jour**.

« Aujourd'hui » est le jour dans le fuseau horaire de Gladys. Les chiffres
viennent des extensions d'éditeur qui envoient votre activité à Wakapi ou à
WakaTime : l'intégration ne fait que les lire.

## Avant de commencer

- Un serveur Wakapi (le vôtre, en Docker par exemple, ou le public
  wakapi.dev), ou un compte WakaTime, qui reçoit déjà votre activité.
- La **clé d'API** de votre compte : dans Wakapi, **Settings → API key** ;
  sur WakaTime, **Settings → API Key** (`https://wakatime.com/settings/api-key`).

## Configuration

1. Ouvrez l'onglet **Configuration** de l'intégration.
2. **Adresse du serveur** : l'adresse de votre Wakapi, telle que vous
   l'ouvrez dans le navigateur (`http://192.168.1.20:3000`,
   `https://wakapi.example.org`, avec son chemin s'il est servi sous un
   chemin), `wakapi.dev`, ou `wakatime.com`.
3. **Clé d'API** : collez la clé de votre compte.
4. Options : l'**objectif du jour** en minutes (2 heures par défaut),
   l'**intervalle de rafraîchissement** (5 minutes par défaut, 30 au plus),
   la **langue des textes** (noms des fonctionnalités, fixés à l'ajout de
   l'appareil, et messages). **Accepter un certificat auto-signé** ne sert
   qu'à un Wakapi servi en HTTPS avec son propre certificat.
5. Enregistrez, puis ajoutez l'appareil depuis l'onglet **Découverte**.

L'action **Tester la connexion** lit le serveur tout de suite et indique le
compte trouvé et le temps de code du jour. L'interrupteur « Préférer la
connexion locale » ajouté par Gladys n'a pas d'effet ici : il n'y a qu'une
adresse.

## Scènes

Déclencheurs, dans la catégorie **Intégrations** de l'éditeur de scènes
(Gladys 5.1 ou plus récent) :

- **Premier code de la journée** : le premier temps de code de la journée
  apparaît sur le compte. Variables : projet, langage, minutes aujourd'hui.
- **Objectif de code du jour atteint** : le temps de code du jour a atteint
  l'objectif réglé dans la configuration, une fois par jour. Variables :
  minutes aujourd'hui, objectif, projet principal, langage principal.

Action :

- **Lire le temps de code du jour** : le temps de code du jour et de la
  semaine en une phrase, pour un message ou une annonce vocale (« 1 h 40 min
  de code aujourd'hui (objectif 2 h), surtout sur mon-projet en JavaScript.
  Cette semaine : 5 h 53 min. »), avec les chiffres en variables pour les
  actions suivantes.

Un autre seuil que l'objectif (« plus de 6 heures aujourd'hui ») est une
condition de scène sur la fonctionnalité **Temps de code aujourd'hui**.

## Tableau de bord

Le widget **Temps de code** affiche le temps du jour, la semaine, une jauge
de l'objectif du jour, un histogramme des 7 derniers jours et les projets du
jour. Chaque bloc sauf « aujourd'hui » se masque dans les réglages du widget.
Il fonctionne avant l'ajout de l'appareil.

## Limites

- Lecture seule : l'intégration n'envoie jamais rien à Wakapi ni à WakaTime.
- Les jours sont demandés dans le fuseau horaire de Gladys. Wakapi les
  compte dans le fuseau de votre compte (ses paramètres) : gardez les deux
  identiques.
- Les chiffres suivent le serveur : ils apparaissent une fois que votre
  extension d'éditeur a envoyé ses battements (quelques minutes) et que la
  lecture suivante a eu lieu.
- WakaTime : l'offre gratuite garde deux semaines d'historique, assez pour
  les 7 derniers jours lus ici. Chaque lecture fait deux requêtes au plus (le
  compte une fois, puis les résumés), toutes les 5 minutes au plus souvent,
  bien en dessous des limites documentées par WakaTime. L'intégration a été
  testée contre un vrai Wakapi (image Docker officielle) avec de vrais
  battements, pas contre un compte WakaTime : vos retours sont bienvenus.

## Dépannage

- **Clé d'API refusée** : recopiez la clé depuis les paramètres de votre
  compte.
- **Cette adresse ne répond pas comme Wakapi ou WakaTime** : vérifiez
  l'adresse ; un Wakapi derrière un proxy inverse sous un chemin a besoin de
  ce chemin.
- **Le serveur redirige** : saisissez son adresse finale (souvent
  `https://`).
- **Certificat refusé** : cochez **Accepter un certificat auto-signé**.
- Les journaux de l'intégration (Intégrations → Wakapi → Journaux) en disent
  plus ; `LOG_LEVEL=debug` montre chaque lecture.

## Vos retours

Vos retours sont bienvenus, surtout ceux des utilisateurs de WakaTime :
ouvrez un ticket sur <https://github.com/guim31/gladys-wakapi/issues> ou
écrivez sur le forum de Gladys.
