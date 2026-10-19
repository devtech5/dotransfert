/*
 * DO Transfert — configuration du site.
 * Toutes les informations commerciales (coordonnées, tarifs, lieux) sont ici :
 * modifiez ce fichier pour adapter le site sans toucher au reste du code.
 */
window.DOT_CONFIG = {
  brand: {
    name: "DO Transfert",
    tagline: "Chauffeurs privés & transferts premium",
    phone: "+33 1 00 00 00 00",       // À remplacer par le vrai numéro
    phoneHref: "+33100000000",
    whatsapp: "33600000000",           // Format international sans « + » ni espaces
    email: "contact@dotransfert.com",
    address: "Paris, France",
    hours: "24h/24 · 7j/7",
  },

  currency: "EUR",
  locale: "fr-FR",

  // Facultatif : URL d'un service de formulaires (Formspree, Getform, votre API…).
  // Si vide, la réservation est envoyée par WhatsApp ou par e-mail.
  bookingEndpoint: "",

  // Majoration de nuit (22h–6h) et remise sur l'aller-retour.
  nightSurcharge: 0.15,
  returnDiscount: 0.05,
  roadFactor: 1.3, // Distance à vol d'oiseau × facteur = distance routière estimée

  vehicles: [
    {
      id: "business",
      name: "Berline Business",
      models: "Mercedes Classe E, BMW Série 5 ou similaire",
      shape: "sedan",
      passengers: 3,
      luggage: 3,
      base: 45,
      perKm: 1.9,
      perHour: 55,
      minimum: 65,
      perks: ["Wi-Fi à bord", "Eau minérale", "Attente offerte"],
    },
    {
      id: "first",
      name: "Berline Première",
      models: "Mercedes Classe S, BMW Série 7 ou similaire",
      shape: "sedan",
      passengers: 3,
      luggage: 2,
      base: 75,
      perKm: 2.8,
      perHour: 85,
      minimum: 110,
      perks: ["Sièges cuir massants", "Chauffeur senior", "Presse & rafraîchissements"],
      featured: true,
    },
    {
      id: "suv",
      name: "SUV Premium",
      models: "Mercedes GLE, Range Rover Sport ou similaire",
      shape: "suv",
      passengers: 4,
      luggage: 4,
      base: 60,
      perKm: 2.3,
      perHour: 70,
      minimum: 90,
      perks: ["Grand coffre", "Position haute", "Confort familial"],
    },
    {
      id: "van",
      name: "Van Business",
      models: "Mercedes Classe V ou similaire",
      shape: "van",
      passengers: 7,
      luggage: 7,
      base: 65,
      perKm: 2.4,
      perHour: 75,
      minimum: 95,
      perks: ["Jusqu'à 7 passagers", "Idéal groupes & familles", "Bagages volumineux"],
    },
  ],

  extras: [
    { id: "sign", label: "Accueil avec pancarte nominative", price: 0 },
    { id: "childseat", label: "Siège enfant / rehausseur", price: 10 },
    { id: "flowers", label: "Bouquet de bienvenue", price: 35 },
  ],

  // Lieux proposés à l'autocomplétion (coordonnées pour l'estimation du prix).
  places: [
    { name: "Aéroport Paris-Charles de Gaulle (CDG)", type: "airport", lat: 49.0097, lng: 2.5479 },
    { name: "Aéroport Paris-Orly (ORY)", type: "airport", lat: 48.7262, lng: 2.3652 },
    { name: "Aéroport Paris-Beauvais (BVA)", type: "airport", lat: 49.4544, lng: 2.1128 },
    { name: "Aéroport Paris-Le Bourget (LBG)", type: "airport", lat: 48.9694, lng: 2.4414 },
    { name: "Gare du Nord, Paris", type: "station", lat: 48.8809, lng: 2.3553 },
    { name: "Gare de Lyon, Paris", type: "station", lat: 48.8443, lng: 2.3744 },
    { name: "Gare Montparnasse, Paris", type: "station", lat: 48.8409, lng: 2.3200 },
    { name: "Gare de l'Est, Paris", type: "station", lat: 48.8768, lng: 2.3592 },
    { name: "Gare Saint-Lazare, Paris", type: "station", lat: 48.8763, lng: 2.3253 },
    { name: "Paris centre — Champs-Élysées", type: "city", lat: 48.8698, lng: 2.3078 },
    { name: "Paris — Tour Eiffel", type: "city", lat: 48.8584, lng: 2.2945 },
    { name: "Paris — Opéra / Grands Boulevards", type: "city", lat: 48.8719, lng: 2.3316 },
    { name: "Paris — Le Marais", type: "city", lat: 48.8590, lng: 2.3620 },
    { name: "La Défense", type: "business", lat: 48.8919, lng: 2.2384 },
    { name: "Disneyland Paris", type: "leisure", lat: 48.8722, lng: 2.7758 },
    { name: "Château de Versailles", type: "leisure", lat: 48.8049, lng: 2.1204 },
    { name: "Parc des Expositions Paris-Nord Villepinte", type: "business", lat: 48.9729, lng: 2.5150 },
    { name: "Stade de France, Saint-Denis", type: "leisure", lat: 48.9245, lng: 2.3601 },
    { name: "Reims", type: "city", lat: 49.2583, lng: 4.0317 },
    { name: "Rouen", type: "city", lat: 49.4432, lng: 1.0999 },
    { name: "Deauville", type: "city", lat: 49.3600, lng: 0.0750 },
    { name: "Lille", type: "city", lat: 50.6292, lng: 3.0573 },
    { name: "Bruxelles", type: "city", lat: 50.8503, lng: 4.3517 },
  ],
};
