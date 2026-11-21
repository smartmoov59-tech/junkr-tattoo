/* ------------------------------------------------------------------
   JunkR Tattoo — réglages du site (à modifier ici, sans toucher au reste)
   ------------------------------------------------------------------ */
window.JUNKR = {
  nom: 'JunkR Tattoo',
  phone: '+33677418532',
  phoneDisplay: '06 77 41 85 32',
  instagram: 'junkr_tattoo',
  address: '15 Rue Saint-Julien, 54000 Nancy',

  /* Tarifs : les prix ne sont pas publiés par le salon (ni sur Google, ni sur Instagram).
     null  = affiche « Sur devis »
     texte = affiche ce texte, par exemple 'À partir de 80 €' */
  prices: {
    blackwork: null,
    fineline: null,
    floral: null,
    realisme: null,
    flash: null,
    rouge: null,
    patchwork: null
  },

  /* Horaires (heure de Paris) : jour (0 = dimanche) → [ouverture, fermeture] ou null si fermé.
     Source : fiche Google Maps. */
  hours: { 0: null, 1: [10, 19], 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [10, 19] },

  /* Créneaux proposés dans le formulaire de demande de rendez-vous */
  periods: [
    { id: 'matin', label: 'Matin', hint: '10 h – 13 h', start: 10 },
    { id: 'apres-midi', label: 'Après-midi', hint: '13 h – 16 h', start: 13 },
    { id: 'fin-de-journee', label: 'Fin de journée', hint: '16 h – 19 h', start: 16 }
  ]
};
