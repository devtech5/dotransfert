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

## Calcul des prix

- **Transfert** : `max(minimum, prise en charge + prix/km × distance)`. La distance est estimée à vol d'oiseau
  entre deux lieux de la liste `places`, multipliée par `roadFactor`.
  Si l'un des lieux saisis n'est pas dans la liste, le véhicule affiche « Sur devis » et la demande reste possible.
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

- Palette noir profond / champagne / ivoire, typographies *Cormorant Garamond* (titres) et *Manrope* (texte).
- Illustrations de véhicules et icônes en SVG (aucune image externe à charger).
- Responsive du mobile au grand écran, navigation clavier, autocomplétion accessible (ARIA combobox),
  respect de `prefers-reduced-motion`.
