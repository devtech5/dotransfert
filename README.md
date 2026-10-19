# DO Transfert — site de réservation de chauffeur privé

Site vitrine et tunnel de réservation pour un service de véhicules avec chauffeur (VTC premium) :
transferts aéroport et gare, mise à disposition à l'heure, voyages d'affaires, événements.

Site 100 % statique (HTML, CSS, JavaScript sans dépendance) : il s'héberge partout
(Netlify, Vercel, GitHub Pages, OVH, o2switch…) sans étape de compilation.

## Pages

| Fichier | Rôle |
| --- | --- |
| `index.html` | Accueil : formulaire de réservation, étapes, flotte, services, trajets populaires, avis, FAQ |
| `reservation.html` | Tunnel en 3 étapes : choix du véhicule (prix calculé), coordonnées et options, récapitulatif et confirmation |

## Personnalisation

Les informations commerciales sont toutes dans **`assets/js/config.js`** :

- `brand` : nom, téléphone, numéro WhatsApp, e-mail, adresse, horaires (les valeurs fournies sont des **exemples à remplacer**) ;
- `vehicles` : catégories, capacités, tarifs (prise en charge, prix au km, prix horaire, minimum) ;
- `extras` : options payantes ou offertes (siège enfant, pancarte…) ;
- `places` : lieux proposés en autocomplétion, avec leurs coordonnées GPS (servent à estimer la distance) ;
- `nightSurcharge`, `returnDiscount`, `roadFactor` : majoration de nuit, remise aller-retour, facteur route.

Les « trajets populaires » de l'accueil se modifient dans le bloc `<template id="popular-routes">` de `index.html`.

## Carte et itinéraire

À l'étape « Choix du véhicule », une carte (Leaflet, fournie dans `assets/vendor/leaflet`) affiche le départ (A),
l'arrivée (B) et l'itinéraire routier, avec la distance et la durée estimée. La distance réelle de l'itinéraire
sert au calcul des prix.

- **Recherche d'adresses** : le formulaire propose d'abord les lieux de `places`, puis les adresses, hôtels et lieux
  trouvés en ligne ([Photon](https://photon.komoot.io), données OpenStreetMap).
- **Itinéraire** : [OSRM](https://project-osrm.org). Si le service ne répond pas, un tracé estimé (en pointillés) est affiché.
- **Fond de carte** : CARTO Voyager.

Ces services publics et gratuits conviennent à un trafic modéré. Pour un usage intensif, remplacez les URL de
`map` dans `config.js` par votre propre instance ou par un fournisseur avec clé API (Mapbox, OpenRouteService…).

## Application installable (PWA)

Le site est une Progressive Web App : sur mobile comme sur ordinateur, le navigateur propose de l'installer
(bouton « Installer l'app » dans l'en-tête et le menu mobile, ou menu du navigateur ; sur iPhone : Partager ›
« Sur l'écran d'accueil »). L'application s'ouvre alors en plein écran, avec son icône.

- `manifest.webmanifest` : nom, couleurs, icônes (`assets/img/icons/`) et raccourcis.
- `sw.js` : service worker. Les pages et fichiers du site restent disponibles hors ligne ; sans connexion, une page
  `offline.html` propose de réessayer ou d'appeler. Carte, itinéraire et recherche d'adresses restent en ligne.
- **À chaque mise en ligne**, incrémentez `VERSION` dans `sw.js` (`dot-v2`, `dot-v3`…) pour que les visiteurs
  reçoivent les nouveaux fichiers.
- Le service worker ne fonctionne qu'en HTTPS (ou sur `localhost`). Remplacez aussi les icônes par votre logo officiel.

## Logo

Déposez le logo (PNG ou SVG, fond transparent de préférence) dans `assets/img/` et indiquez son chemin dans
`brand.logo` de `config.js` : il remplace automatiquement le monogramme « DO » dans l'en-tête et le pied de page.

## Calcul des prix

- **Transfert** : `max(minimum, prise en charge + prix/km × distance)`. La distance est celle de l'itinéraire routier ;
  à défaut, la distance à vol d'oiseau multipliée par `roadFactor`.
  Si une adresse est introuvable, le véhicule affiche « Sur devis » et la demande reste possible.
- **Mise à disposition** : `max(minimum, prix horaire × nombre d'heures)`.
- Majoration de nuit (22 h – 6 h), remise aller-retour, options multipliées par le nombre de trajets ; arrondi aux 5 € supérieurs.

## Réception des réservations

Par défaut, l'écran de confirmation propose d'envoyer la réservation complète (avec sa référence) **par WhatsApp**
ou **par e-mail**, pré-remplie.

Pour recevoir les réservations automatiquement, renseignez `bookingEndpoint` dans `config.js` avec l'URL d'un
service de formulaires (Formspree, Getform…) ou de votre propre API : la réservation y est envoyée en JSON (`POST`).

## Aperçu local

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

## Design

- Palette noir / orange / ivoire (variables `--ink`, `--accent`… en tête de `assets/css/styles.css`), typographies *Cormorant Garamond* (titres) et *Manrope* (texte).
- Illustrations de véhicules et icônes en SVG (aucune image externe à charger).
- Responsive du mobile au grand écran, navigation clavier, autocomplétion accessible (ARIA combobox),
  respect de `prefers-reduced-motion`.
