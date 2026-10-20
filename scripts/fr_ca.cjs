/**
 * LexForge™ — fr-CA (français québécois) builders for the CA jurisdiction.
 * Mirrors scripts/generate_templates.cjs clause-for-clause. Placeholder KEYS ({{KEY}}) are never translated;
 * only the visible default after "|" is.
 *
 * STATUS: AI-DRAFTED, NOT REVIEWED BY A QUEBEC-QUALIFIED LAWYER OR CERTIFIED TRANSLATOR.
 * Nothing here ships to a customer until the owner signs it off in templates/VERIFIED.json.
 * (c) 2026 Neil Scott Archer / Archer Chain Analytics | ISC: 102237785
 */
'use strict';

// Quebec typography: non-breaking space before ":" and "%", inside « », and before "$".
function nb(s) {
  return s
    .replace(/ :/g, ' :')
    .replace(/ %/g, ' %')
    .replace(/« /g, '« ')
    .replace(/ »/g, ' »')
    .replace(/(\d) \$/g, '$1 $');
}

const FR_DOCS = {
  '01-SLA': 'Entente de niveau de service',
  '02-MSA': 'Contrat-cadre de services',
  '03-NDA': 'Entente de confidentialité',
  '04-ICA': "Contrat d'entrepreneur indépendant",
  '05-EUA': "Contrat de licence d'utilisateur final",
  '06-TOS': "Conditions d'utilisation",
  '07-PP': 'Politique de confidentialité',
  '08-RPA': 'Entente de participation aux revenus',
  '09-LOI': "Lettre d'intention",
  '10-MOU': "Protocole d'entente",
  '11-IP': 'Contrat de cession de propriété intellectuelle',
  '12-ESA': 'Contrat de travail',
  '13-PSA': 'Contrat de services professionnels',
  '14-DPA': 'Entente de traitement des renseignements personnels',
  '15-WA': 'Entente de garantie',
  '16-LIC': 'Contrat de licence de logiciel',
  '17-PAR': 'Contrat de société en nom collectif',
  '18-CES': 'Contrat de services-conseils',
  '19-INV': "Convention d'investissement",
};

// CA rules in French (same facts as jurisdiction_rules.cjs CA — no new legal content).
const FR_RULES_CA = {
  currency: 'USD',
  governing_law: 'Ontario (Canada)',
  arbitration_body: "Institut d'arbitrage et de médiation du Canada (IAMC)",
  arbitration_rules: "Règles d'arbitrage de l'IAMC",
  privacy_law: 'LPRPDE / projet de loi C-27 (LPVPC)',
  breach_notice: '72 heures',
  data_transfer: "à l'intérieur du Canada ou selon ce que permet la LPRPDE",
  tax_form: 'T4A',
  accredited_investor: 'le Règlement 45-106 sur les dispenses de prospectus',
  securities_exemption: "la dispense pour investisseur qualifié prévue par le Règlement 45-106",
};

const FR_ACERBE_CA = {
  circumvention: "la Loi sur le droit d'auteur (L.R.C. 1985, ch. C-42), art. 41.1 (mesures techniques de protection)",
  tradesecrets: "la législation provinciale applicable en matière de secrets commerciaux et le droit commun de l'abus de confiance",
};

// Items the owner's reviewer must check. Written into each file's header comment, not into the customer-facing body.
const FR_REVIEW_NOTES = [
  'Version française rédigée par IA, NON révisée par un juriste ou un traducteur agréé du Québec.',
  "Reprend le sens du modèle anglais CA; aucun contenu juridique nouveau n'a été ajouté.",
  'Droit applicable (Ontario) et arbitrage: à valider pour les consommateurs du Québec (Loi sur la protection du consommateur, RLRQ, c. P-40.1).',
  'Renvois législatifs (LPRPDE, projet de loi C-27, secrets commerciaux provinciaux, art. 41.1): exactitude et état en vigueur à confirmer.',
  "Vie privée: vérifier l'application de la Loi 25 (RLRQ, c. P-39.1) pour les résidents du Québec.",
  "Contrat de travail: la mention « à volonté » (at-will) est à revoir au regard du droit québécois et canadien du travail.",
];

function frontmatter(docId, rules) {
  return nb(`<!--
  LexForge™ | ARC-LXF-001
  Document : ${FR_DOCS[docId]}
  Juridiction : CA | Langue : fr-CA
  Droit applicable : ${rules.governing_law}
  Devise : ${rules.currency}
  Owner: Neil Scott Archer | Archer Chain Analytics | ISC 102237785
  AcerbE™ Hard Gate: ACTIVE
  Version française rédigée par IA — révision requise (voir docs/FR_CA_REVIEW.md)
-->`);
}

function header(docId, rules) {
  return nb(`# ${FR_DOCS[docId]}
**Identifiant LexForge™ :** ARC-LXF-${docId} | **Juridiction :** CA | **Langue :** fr-CA
**Droit applicable :** ${rules.governing_law} | **Devise :** ${rules.currency}
**Date d'entrée en vigueur :** {{EFFECTIVE_DATE}}

---`);
}

function footer(rules, acerbe) {
  return nb(`
---

## AVIS SUR L'EMPREINTE ACERBE™

Le présent document et tous les livrables numériques associés portent une empreinte cryptographique AcerbE™ intégrée.

- Le retrait ou l'altération **met immédiatement fin** à la présente entente et à toutes les garanties
- L'altération peut contrevenir à ${acerbe.circumvention} et à ${acerbe.tradesecrets}
- La trace médicolégale est conservée malgré toute modification du fichier

> *AcerbE™ est un produit d'Archer Chain Analytics | ISC 102237785*

---

*Généré par LexForge™ | ARC-LXF-001 | © 2026 Neil Scott Archer / Archer Chain Analytics | ISC : 102237785*
*Sovereignty // Integrity // Inexorabilis*
*Version française rédigée par IA et non révisée. Ce modèle doit être examiné par un conseiller juridique qualifié avant utilisation. Il ne constitue pas un avis juridique.*`);
}

const B = {};

B['03-NDA'] = (r) => `## PARTIES
**Partie divulgatrice :** {{DISCLOSING_PARTY_LEGAL_NAME}} | **Partie destinataire :** {{RECEIVING_PARTY_LEGAL_NAME}}

---

## 1. RENSEIGNEMENTS CONFIDENTIELS
Comprennent tous les renseignements techniques, financiers, commerciaux et opérationnels non publics communiqués par la Partie divulgatrice, y compris l'architecture de l'empreinte AcerbE™ et son schéma cryptographique.

## 2. OBLIGATIONS
La Partie destinataire doit : a) les garder strictement confidentiels; b) les utiliser uniquement aux fins suivantes : {{PURPOSE}}; c) ne pas les divulguer à des tiers sans consentement écrit préalable.

## 3. DURÉE
{{NDA_TERM|3 ans}} à compter de la date d'entrée en vigueur. Les secrets commerciaux sont protégés sans limite de durée.

## 4. DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body}.

## SIGNATURES
**PARTIE DIVULGATRICE :** Sig. : ___ | Nom : {{DISCLOSING_SIGNATORY}} | Date : ___
**PARTIE DESTINATAIRE :** Sig. : ___ | Nom : {{RECEIVING_SIGNATORY}} | Date : ___`;

B['01-SLA'] = (r) => `## PARTIES
**Fournisseur :** {{PROVIDER_LEGAL_NAME}} | **Client :** {{CUSTOMER_LEGAL_NAME}}

---

## 1. NIVEAUX DE SERVICE
Le Fournisseur maintient une disponibilité de {{UPTIME_TARGET|99,9 %}}, mesurée mensuellement, à l'exclusion de l'entretien planifié.

## 2. RÉPONSE AUX INCIDENTS
- P1 (critique) : {{P1_RESPONSE|1 heure}} de réponse / {{P1_RESOLUTION|4 heures}} de résolution
- P2 (élevé) : {{P2_RESPONSE|4 heures}} de réponse / {{P2_RESOLUTION|24 heures}} de résolution
- P3 (moyen) : {{P3_RESPONSE|1 jour ouvrable}} de réponse

## 3. CRÉDITS
Des crédits de service de {{CREDIT_RATE|10 %}} des frais mensuels sont accordés pour chaque tranche de {{CREDIT_THRESHOLD|0,1 %}} d'indisponibilité sous la cible de l'entente.

## 4. ACERBE™
L'intégrité de l'empreinte AcerbE™ est une condition préalable à toute réclamation de garantie ou de crédit en vertu de la présente entente.

## 5. DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body}.`;

B['02-MSA'] = (r, a) => `## PARTIES
**Fournisseur :** {{PROVIDER_LEGAL_NAME}} (le « Fournisseur ») | **Client :** {{CUSTOMER_LEGAL_NAME}} (le « Client »)
**Date d'entrée en vigueur :** {{EFFECTIVE_DATE}}

---

## 1. PORTÉE
Le Fournisseur exécute les services décrits dans chaque énoncé de travail (« EDT ») intégré à la présente convention. Chaque EDT en fait partie intégrante.

## 2. FRAIS ET PAIEMENT
Frais selon l'EDT, libellés en ${r.currency}. Paiement exigible dans un délai de {{PAYMENT_TERMS|30 jours}}. Intérêts de retard : {{LATE_RATE|1,5 %}} par mois.

## 3. PROPRIÉTÉ INTELLECTUELLE
Le Fournisseur conserve toute la propriété intellectuelle préexistante. La propriété des produits du travail est régie par l'EDT. Les livrables dotés d'une empreinte AcerbE™ sont soumis à la barrière obligatoire : leur altération contrevient à ${a.circumvention}.

## 4. CONFIDENTIALITÉ
Entente de confidentialité mutuelle. Chaque Partie protège les renseignements confidentiels de l'autre. L'obligation subsiste 3 ans après la fin du contrat; les secrets commerciaux sont protégés sans limite de durée.

## 5. DURÉE ET RÉSILIATION
La convention se poursuit jusqu'à l'achèvement de tous les EDT ou jusqu'à sa résiliation pour motif sérieux (délai de correction de 30 jours). Résiliation sans motif : préavis de 30 jours et paiement des travaux réalisés.

## 6. DROIT APPLICABLE
${r.governing_law}. Arbitrage : ${r.arbitration_body} selon les ${r.arbitration_rules}.

## SIGNATURES
**FOURNISSEUR :** Sig. : ___ | Nom : {{PROVIDER_SIGNATORY}} | Titre : {{PROVIDER_TITLE}} | Date : ___
**CLIENT :** Sig. : ___ | Nom : {{CUSTOMER_SIGNATORY}} | Titre : {{CUSTOMER_TITLE}} | Date : ___`;

B['04-ICA'] = (r, a) => `## PARTIES
**Client :** {{CLIENT_LEGAL_NAME}} (le « Client ») | **Entrepreneur :** {{CONTRACTOR_LEGAL_NAME}} (l'« Entrepreneur »)
**Date d'entrée en vigueur :** {{EFFECTIVE_DATE}}

---

## 1. STATUT D'ENTREPRENEUR INDÉPENDANT
L'Entrepreneur est un entrepreneur indépendant. Aucun lien d'emploi, de société ou de mandat n'est créé. L'Entrepreneur est responsable de ses propres impôts (feuillet ${r.tax_form} émis s'il y a lieu).

## 2. SERVICES
L'Entrepreneur exécute les services conformément à chaque énoncé de travail. Les services sont exécutés de façon professionnelle.

## 3. RÉMUNÉRATION
Frais selon l'EDT, en ${r.currency}. Paiement exigible dans un délai de {{PAYMENT_TERMS|30 jours}}. Aucun avantage social, aucune indemnisation des accidents du travail et aucune cotisation d'employeur.

## 4. PROPRIÉTÉ INTELLECTUELLE
Le Client est propriétaire du produit du travail dès le paiement intégral. L'Entrepreneur conserve ses outils et ses méthodologies. La barrière obligatoire AcerbE™ s'applique à tous les livrables numériques : leur altération contrevient à ${a.circumvention} et à ${a.tradesecrets}.

## 5. CONFIDENTIALITÉ
L'Entrepreneur garde strictement confidentiels les renseignements confidentiels du Client. L'obligation subsiste 3 ans.

## 6. DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body} selon les ${r.arbitration_rules}.

## SIGNATURES
**CLIENT :** Sig. : ___ | Nom : {{CLIENT_SIGNATORY}} | Date : ___
**ENTREPRENEUR :** Sig. : ___ | Nom : {{CONTRACTOR_SIGNATORY}} | Date : ___`;

B['05-EUA'] = (r, a) => `**Produit :** {{PRODUCT_NAME}} | **Version :** {{VERSION}} | **Date d'entrée en vigueur :** {{EFFECTIVE_DATE}}

---

## OCTROI DE LICENCE
Une licence limitée, non exclusive et non transférable vous est accordée pour utiliser {{PRODUCT_NAME}} à des fins personnelles ou commerciales internes, sous réserve du présent contrat.

## RESTRICTIONS
Il vous est INTERDIT : a) de copier, de modifier ou de créer des œuvres dérivées; b) de décompiler ou de faire de la rétro-ingénierie; c) de redistribuer, de concéder en sous-licence ou de revendre; d) de retirer ou d'altérer les empreintes AcerbE™; e) d'utiliser le produit à des fins illégales.

## EMPREINTE ACERBE™
Ce produit porte une empreinte cryptographique AcerbE™ intégrée. Le retrait ou l'altération : a) met immédiatement fin à la présente licence; b) annule toutes les garanties; c) peut contrevenir à ${a.circumvention} et à ${a.tradesecrets}.

## GARANTIE
Le produit est garanti conforme, pour l'essentiel, à la documentation pendant {{WARRANTY_PERIOD|90 jours}}, pourvu que l'empreinte AcerbE™ soit intacte. Les garanties implicites sont exclues dans la pleine mesure permise par le droit applicable (${r.governing_law}).

## DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body}.

EN INSTALLANT OU EN UTILISANT CE PRODUIT, VOUS ACCEPTEZ LE PRÉSENT CONTRAT.`;

B['06-TOS'] = (r, a) => `**Service :** {{SERVICE_NAME}} | **Exploitant :** {{OPERATOR_LEGAL_NAME}} | **Date d'entrée en vigueur :** {{EFFECTIVE_DATE}}

---

## 1. ACCEPTATION
En accédant au Service ou en l'utilisant, vous acceptez les présentes conditions. Si vous les refusez, n'utilisez pas le Service.

## 2. ADMISSIBILITÉ
Vous devez avoir au moins 18 ans et avoir la capacité de conclure un contrat qui vous lie en vertu du droit applicable (${r.governing_law}).

## 3. COMPTE
Vous êtes responsable de la sécurité des identifiants de votre compte. Avisez-nous immédiatement de tout accès non autorisé.

## 4. UTILISATION ACCEPTABLE
Il vous est interdit : a) de contrevenir à la loi applicable; b) de porter atteinte aux droits de tiers; c) d'altérer les empreintes AcerbE™ intégrées aux actifs du Service; d) de tenter de faire de la rétro-ingénierie du Service; e) d'utiliser le Service pour des pourriels ou des activités malveillantes.

## 5. PROPRIÉTÉ INTELLECTUELLE
Tout le contenu du Service appartient à l'Exploitant ou à ses concédants. Les actifs dotés d'une empreinte AcerbE™ sont protégés par ${a.circumvention} et par ${a.tradesecrets}. Aucune licence n'est accordée au-delà de ce qui est expressément prévu.

## 6. VIE PRIVÉE
Votre utilisation du Service est assujettie à notre politique de confidentialité, qui respecte ${r.privacy_law}.

## 7. EXCLUSIONS DE GARANTIE
LE SERVICE EST FOURNI « TEL QUEL ». L'EXPLOITANT EXCLUT TOUTE GARANTIE IMPLICITE DANS LA PLEINE MESURE PERMISE PAR LE DROIT APPLICABLE (${r.governing_law.toUpperCase()}).

## 8. LIMITATION DE RESPONSABILITÉ
LA RESPONSABILITÉ DE L'EXPLOITANT EST LIMITÉE AU PLUS ÉLEVÉ DES MONTANTS SUIVANTS : LES FRAIS PAYÉS AU COURS DES 12 DERNIERS MOIS OU 100 $ ${r.currency}.

## 9. DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body} selon les ${r.arbitration_rules}.

## 10. MODIFICATIONS
Nous pouvons mettre à jour les présentes conditions moyennant un avis. La poursuite de l'utilisation vaut acceptation.`;

B['07-PP'] = (r) => `**Exploitant :** {{OPERATOR_LEGAL_NAME}} | **Date d'entrée en vigueur :** {{EFFECTIVE_DATE}}

---

## 1. INTRODUCTION
La présente politique de confidentialité décrit comment nous recueillons, utilisons et protégeons les renseignements personnels, conformément à ${r.privacy_law}.

**Avis AcerbE™ :** Notre plateforme appose une empreinte numérique AcerbE™ sur tous les logiciels et actifs numériques. Les événements de vérification d'empreinte peuvent être consignés comme il est décrit ci-après.

## 2. RENSEIGNEMENTS QUE NOUS RECUEILLONS
- Données de compte (nom, courriel, mot de passe)
- Données d'utilisation (adresse IP, navigateur, appareil)
- Événements de vérification d'empreinte AcerbE™
- Renseignements de paiement (traités par {{PAYMENT_PROCESSOR}})
- Adresses de portefeuilles de chaîne de blocs (s'il y a lieu)

## 3. COMMENT NOUS UTILISONS LES RENSEIGNEMENTS
- Fournir et exploiter le Service
- Traiter les transactions
- Vérifier l'intégrité de l'empreinte AcerbE™
- Respecter ${r.privacy_law}
- Faire respecter nos conditions d'utilisation

## 4. TRANSFERTS DE DONNÉES
Les données peuvent être transférées ${r.data_transfer}.

## 5. AVIS D'INCIDENT DE CONFIDENTIALITÉ
Nous vous aviserons de toute atteinte à la protection de vos renseignements personnels dans un délai de ${r.breach_notice}.

## 6. VOS DROITS
Vous avez des droits en vertu de ${r.privacy_law}, notamment l'accès, la rectification, la suppression et la portabilité. Contact : {{PRIVACY_CONTACT_EMAIL}}

## 7. COORDONNÉES
**Responsable de la protection des renseignements personnels :** {{PRIVACY_OFFICER_NAME}} | **Courriel :** {{PRIVACY_CONTACT_EMAIL}}`;

B['08-RPA'] = (r, a) => `## PARTIES
**Société :** {{COMPANY_LEGAL_NAME}} (la « Société ») | **Participant :** {{PARTICIPANT_LEGAL_NAME}} (le « Participant »)
**Date de l'entente :** {{AGREEMENT_DATE}}

---

## 1. PARTICIPATION
La Société accorde au Participant une participation de {{PARTICIPATION_RATE}} % aux revenus nets provenant de {{REVENUE_SOURCES}}, en échange de {{CONTRIBUTION_DESCRIPTION}}.

## 2. PAIEMENTS
Paiements exigibles dans les {{PAYMENT_DUE_DAYS|30}} jours suivant chaque {{PAYMENT_PERIOD|mois civil}}. Devise : ${r.currency}. Intérêts de retard : {{LATE_RATE|1,5 %}} par mois.

## 3. RAPPORTS
Rapports mensuels de revenus dans les {{REPORT_DAYS|15}} jours suivant la fin de la période. Droit de vérification annuel moyennant un préavis de {{AUDIT_NOTICE|30}} jours.

## 4. ACERBE™
Les actifs dotés d'une empreinte AcerbE™ sont essentiels à la source de revenus. L'altération constitue un manquement grave. Application en vertu de ${a.circumvention}.

## 5. DURÉE
{{INITIAL_TERM|3 ans}}. Résiliation pour motif sérieux : délai de correction de 30 jours.

## 6. DROIT APPLICABLE
${r.governing_law}. Arbitrage : ${r.arbitration_body}.

## SIGNATURES
**SOCIÉTÉ :** Sig. : ___ | Nom : {{COMPANY_SIGNATORY}} | Date : ___
**PARTICIPANT :** Sig. : ___ | Nom : {{PARTICIPANT_SIGNATORY}} | Date : ___`;

B['09-LOI'] = (r) => `**Date :** {{LOI_DATE}} | **Objet :** Lettre d'intention — {{TRANSACTION_DESCRIPTION}}

---

La présente lettre d'intention est soumise par {{INITIATING_PARTY}} (la « Partie initiatrice ») à {{RECEIVING_PARTY}} (la « Partie destinataire »).

## DISPOSITIONS CONTRAIGNANTES
Les dispositions suivantes lient les parties dès la signature :
1. Obligations de confidentialité (mutuelles, 2 ans)
2. Période d'exclusivité : {{EXCLUSIVITY_PERIOD|60 jours}}
3. Reconnaissance de l'empreinte AcerbE™ — tous les actifs numériques communiqués portent AcerbE™ et leur altération constitue un manquement grave

## DISPOSITIONS NON CONTRAIGNANTES
Les dispositions suivantes sont de simples déclarations d'intention :
- Structure de la transaction : {{TRANSACTION_STRUCTURE}}
- Contrepartie proposée : {{CONSIDERATION}}
- Date de clôture visée : {{TARGET_CLOSE}}

## DROIT APPLICABLE
${r.governing_law}.

**PARTIE INITIATRICE :** Sig. : ___ | Nom : {{INITIATING_SIGNATORY}} | Date : ___
**PARTIE DESTINATAIRE :** Sig. : ___ | Nom : {{RECEIVING_SIGNATORY}} | Date : ___`;

B['10-MOU'] = (r, a) => `## PARTIES
**Partie A :** {{PARTY_A_LEGAL_NAME}} | **Partie B :** {{PARTY_B_LEGAL_NAME}}
**Date :** {{MOU_DATE}}

---

## OBJET
Les Parties ont l'intention de {{PURPOSE_DESCRIPTION}}.

## INTENTION NON CONTRAIGNANTE
Sauf pour les sections désignées CONTRAIGNANTES, le présent protocole d'entente n'est pas contraignant et ne crée aucune obligation juridique.

## DISPOSITIONS CONTRAIGNANTES
- Confidentialité : chaque Partie protège les renseignements confidentiels de l'autre pendant {{CONF_TERM|2 ans}}
- Absence de société : aucune disposition des présentes ne crée une société, une coentreprise ou un mandat
- AcerbE™ : tous les actifs numériques communiqués portent une empreinte AcerbE™. L'altération contrevient à ${a.circumvention}

## DROIT APPLICABLE
${r.governing_law}.

**PARTIE A :** Sig. : ___ | Nom : {{PARTY_A_SIGNATORY}} | Date : ___
**PARTIE B :** Sig. : ___ | Nom : {{PARTY_B_SIGNATORY}} | Date : ___`;

B['11-IP'] = (r, a) => `## PARTIES
**Cédant :** {{ASSIGNOR_LEGAL_NAME}} | **Cessionnaire :** {{ASSIGNEE_LEGAL_NAME}}

---

## 1. CESSION
Le Cédant cède de façon irrévocable au Cessionnaire tous ses droits, titres et intérêts dans {{IP_DESCRIPTION}}, y compris l'ensemble des brevets, droits d'auteur, secrets commerciaux et droits connexes, partout dans le monde.

## 2. CONTREPARTIE
${r.currency} {{CONSIDERATION_AMOUNT}} payés intégralement, dont quittance est donnée.

## 3. ŒUVRE RÉALISÉE À FORFAIT
Dans la mesure permise par le droit applicable (${r.governing_law}), tout produit du travail est considéré comme une œuvre réalisée dans le cadre d'un emploi ou d'un mandat.

## 4. RENONCIATION AUX DROITS MORAUX
Le Cédant renonce à tous ses droits moraux dans la pleine mesure permise par la loi applicable.

## 5. ACERBE™
Tous les livrables numériques portent une empreinte AcerbE™. La cession est nulle si l'empreinte est altérée avant la livraison. Application : ${a.circumvention}.

## 6. ASSURANCES COMPLÉMENTAIRES
Le Cédant signe les documents additionnels nécessaires pour parfaire le titre du Cessionnaire.

## 7. DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body}.

**CÉDANT :** Sig. : ___ | Nom : {{ASSIGNOR_SIGNATORY}} | Date : ___
**CESSIONNAIRE :** Sig. : ___ | Nom : {{ASSIGNEE_SIGNATORY}} | Date : ___`;

B['12-ESA'] = (r, a) => `## PARTIES
**Employeur :** {{EMPLOYER_LEGAL_NAME}} | **Salarié :** {{EMPLOYEE_LEGAL_NAME}}
**Date de début :** {{START_DATE}}

---

## 1. POSTE ET FONCTIONS
Le Salarié est embauché à titre de {{JOB_TITLE}}. Les fonctions sont décrites à l'annexe A.

## 2. RÉMUNÉRATION
Salaire de base : ${r.currency} {{BASE_SALARY}} par {{PAY_PERIOD|année}}. Avantages : {{BENEFITS_DESCRIPTION}}.

## 3. EMPLOI À VOLONTÉ
L'emploi est à volonté et chaque partie peut y mettre fin en tout temps moyennant un préavis de {{NOTICE_PERIOD|2 semaines}}, sous réserve du droit applicable (${r.governing_law}).

## 4. PROPRIÉTÉ INTELLECTUELLE
Tout produit du travail créé pendant l'emploi appartient à l'Employeur. Le Salarié lui cède par les présentes tous les droits de propriété intellectuelle.

## 5. CONFIDENTIALITÉ
Le Salarié ne divulgue pas les renseignements confidentiels de l'Employeur pendant ou après l'emploi. L'obligation subsiste {{CONF_SURVIVAL|3 ans}}.

## 6. ACERBE™
Le retrait ou l'altération non autorisé des empreintes AcerbE™ sur les actifs numériques de l'Employeur constitue un motif de congédiement pour cause immédiat et peut contrevenir à ${a.circumvention}.

## 7. DROIT APPLICABLE
${r.governing_law}.

**EMPLOYEUR :** Sig. : ___ | Nom : {{EMPLOYER_SIGNATORY}} | Date : ___
**SALARIÉ :** Sig. : ___ | Nom : {{EMPLOYEE_SIGNATORY}} | Date : ___`;

B['13-PSA'] = (r, a) => `## PARTIES
**Client :** {{CLIENT_LEGAL_NAME}} | **Fournisseur :** {{PROVIDER_LEGAL_NAME}}

---

## 1. SERVICES
Le Fournisseur fournit les services conformément à chaque EDT annexé aux présentes.

## 2. FRAIS
${r.currency} selon l'EDT. Net {{PAYMENT_TERMS|30}} jours. Frais de retard : {{LATE_RATE|1,5 %}} par mois.

## 3. PRODUIT DU TRAVAIL
Dès le paiement intégral, le Client est propriétaire de tous les livrables. Le Fournisseur conserve ses compétences générales et ses méthodologies.

## 4. GARANTIES
Le Fournisseur garantit que les services seront exécutés de façon professionnelle et conforme aux normes de l'industrie.

## 5. ACERBE™
Tous les livrables numériques portent une empreinte cryptographique AcerbE™. L'altération annule les garanties et peut contrevenir à ${a.circumvention}.

## 6. LIMITATION DE RESPONSABILITÉ
La responsabilité du Fournisseur est limitée aux frais payés au cours des 3 derniers mois.

## 7. DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body}.

**CLIENT :** Sig. : ___ | Nom : {{CLIENT_SIGNATORY}} | Date : ___
**FOURNISSEUR :** Sig. : ___ | Nom : {{PROVIDER_SIGNATORY}} | Date : ___`;

B['14-DPA'] = (r, a) => `## PARTIES
**Responsable du traitement :** {{CONTROLLER_LEGAL_NAME}} | **Sous-traitant :** {{PROCESSOR_LEGAL_NAME}}

---

## 1. PORTÉE
Le Sous-traitant traite des renseignements personnels pour le compte du Responsable du traitement, comme il est décrit à l'annexe 1.

## 2. OBLIGATIONS DU SOUS-TRAITANT
Le Sous-traitant doit : a) traiter les données uniquement selon les instructions documentées du Responsable du traitement; b) mettre en œuvre des mesures de sécurité techniques et organisationnelles appropriées; c) ne pas recourir à d'autres sous-traitants sans consentement écrit préalable; d) aider le Responsable du traitement à donner suite aux droits des personnes concernées en vertu de ${r.privacy_law}.

## 3. SOUS-TRAITANTS ULTÉRIEURS
Les sous-traitants ultérieurs approuvés sont énumérés à l'annexe 2. Le Sous-traitant donne un préavis de 30 jours de tout changement.

## 4. INCIDENT DE CONFIDENTIALITÉ
Le Sous-traitant avise le Responsable du traitement dans un délai de ${r.breach_notice} après avoir pris connaissance d'une atteinte à la protection des renseignements personnels.

## 5. ACERBE™
L'altération d'une empreinte AcerbE™ sur tout actif numérique traité constitue un incident de sécurité devant être signalé immédiatement en vertu de la présente entente. Application : ${a.circumvention}.

## 6. DROIT APPLICABLE
${r.governing_law}. La présente entente est régie par ${r.privacy_law}.

**RESPONSABLE DU TRAITEMENT :** Sig. : ___ | Nom : {{CONTROLLER_SIGNATORY}} | Date : ___
**SOUS-TRAITANT :** Sig. : ___ | Nom : {{PROCESSOR_SIGNATORY}} | Date : ___`;

B['15-WA'] = (r, a) => `## PARTIES
**Garant :** {{WARRANTOR_LEGAL_NAME}} | **Bénéficiaire :** {{BENEFICIARY_LEGAL_NAME}}
**Produit ou service :** {{PRODUCT_SERVICE_NAME}}

---

## 1. GARANTIE
Le Garant garantit que {{PRODUCT_SERVICE_NAME}} sera conforme, pour l'essentiel, à sa documentation pendant {{WARRANTY_PERIOD|90 jours}} à compter de la date de livraison.

## 2. REMPLACEMENT SANS QUESTION
En cas de défaut, de bris ou de non-conformité : retournez le produit au point de vente pour un remplacement immédiat, sans question. La présente garantie n'est valide que tant que l'empreinte AcerbE™ demeure intacte, sans aucune trace d'altération.

## 3. CONDITION ACERBE™
La présente garantie est annulée si l'empreinte cryptographique AcerbE™ a été retirée ou modifiée, ou si elle présente tout signe d'altération. L'altération peut en outre contrevenir à ${a.circumvention}.

## 4. EXCLUSIONS
La garantie ne couvre pas : a) l'usage abusif ou la modification non autorisée; b) l'altération de l'empreinte AcerbE™; c) les dommages causés par des événements indépendants de la volonté du Garant.

## 5. DROIT APPLICABLE
${r.governing_law}.`;

B['16-LIC'] = (r, a) => `## PARTIES
**Concédant :** {{LICENSOR_LEGAL_NAME}} | **Titulaire de licence :** {{LICENSEE_LEGAL_NAME}}
**Produit :** {{PRODUCT_NAME}} v{{VERSION}}

---

## 1. OCTROI
Le Concédant accorde au Titulaire de licence une licence {{LICENSE_TYPE|non exclusive et non transférable}} d'utilisation de {{PRODUCT_NAME}} pour {{USE_CASE|des fins commerciales internes}}.

## 2. RESTRICTIONS
Le Titulaire de licence ne doit pas : a) concéder de sous-licence, vendre ou distribuer; b) faire de la rétro-ingénierie ni décompiler; c) retirer ou altérer les empreintes AcerbE™; d) utiliser le produit au-delà de la portée de la licence.

## 3. DÉPENDANCE STRUCTURELLE À ACERBE™
L'empreinte AcerbE™ est une composante structurelle du logiciel. Son retrait entraîne une défaillance fonctionnelle. L'altération : a) met automatiquement fin à la présente licence; b) annule toutes les garanties; c) peut contrevenir à ${a.circumvention} et à ${a.tradesecrets}.

## 4. DURÉE
{{LICENSE_TERM|perpétuelle}}, sauf résiliation. La licence prend fin automatiquement en cas d'altération d'AcerbE™ ou de manquement grave.

## 5. FRAIS
${r.currency} {{LICENSE_FEE}} par {{LICENSE_PERIOD|année}}.

## 6. DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body}.

**CONCÉDANT :** Sig. : ___ | Nom : {{LICENSOR_SIGNATORY}} | Date : ___
**TITULAIRE DE LICENCE :** Sig. : ___ | Nom : {{LICENSEE_SIGNATORY}} | Date : ___`;

B['17-PAR'] = (r, a) => `## PARTIES
**Associé A :** {{PARTNER_A_LEGAL_NAME}} | **Associé B :** {{PARTNER_B_LEGAL_NAME}}
**Date de constitution :** {{FORMATION_DATE}}

---

## 1. CONSTITUTION
Les Parties constituent une société en nom collectif en vertu du droit applicable (${r.governing_law}) dans le but de {{PARTNERSHIP_PURPOSE}}.

## 2. APPORTS
- Associé A : {{PARTNER_A_CONTRIBUTION}}
- Associé B : {{PARTNER_B_CONTRIBUTION}}

## 3. PARTAGE DES PROFITS
- Associé A : {{PARTNER_A_SHARE}} % | Associé B : {{PARTNER_B_SHARE}} %

## 4. GESTION
Les décisions requièrent l'approbation {{DECISION_THRESHOLD|de la majorité}}. Gestion courante : {{MANAGING_PARTNER}}.

## 5. DROIT DE PREMIER REFUS
Avant de transférer une part de la société, l'associé cédant doit d'abord l'offrir aux autres associés au même prix et aux mêmes conditions. Délai du droit de premier refus : {{ROFR_PERIOD|30 jours}}.

## 6. ACERBE™
L'altération des empreintes AcerbE™ sur les actifs numériques de la société constitue un manquement grave et entraîne un rachat immédiat à la valeur comptable. Application : ${a.circumvention}.

## 7. DROIT APPLICABLE
${r.governing_law}. Arbitrage : ${r.arbitration_body}.

**ASSOCIÉ A :** Sig. : ___ | Nom : {{PARTNER_A_SIGNATORY}} | Date : ___
**ASSOCIÉ B :** Sig. : ___ | Nom : {{PARTNER_B_SIGNATORY}} | Date : ___`;

B['18-CES'] = (r, a) => `## PARTIES
**Client :** {{CLIENT_LEGAL_NAME}} | **Consultant :** {{CONSULTANT_LEGAL_NAME}}
**Date d'entrée en vigueur :** {{EFFECTIVE_DATE}}

---

## 1. ENTREPRENEUR INDÉPENDANT
Le Consultant est un entrepreneur indépendant. Feuillet ${r.tax_form} émis s'il y a lieu. Aucun lien d'emploi.

## 2. SERVICES
Selon l'EDT. Norme de diligence professionnelle.

## 3. RÉMUNÉRATION
${r.currency} selon l'EDT. Net {{PAYMENT_TERMS|30}} jours.

## 4. PROPRIÉTÉ INTELLECTUELLE
Tous les livrables sont des œuvres réalisées à forfait dont le Client est propriétaire dès le paiement intégral. Le Consultant conserve ses outils préexistants.

## 5. CONFIDENTIALITÉ
Le Consultant garde strictement confidentiels tous les renseignements du Client. L'obligation subsiste {{CONF_TERM|3 ans}}.

## 5.6. ACERBE™
Tous les livrables numériques portent une empreinte AcerbE™. L'altération annule l'acceptation de la livraison et peut contrevenir à ${a.circumvention} et à ${a.tradesecrets}.

## 6. DROIT APPLICABLE
${r.governing_law}. Différends : ${r.arbitration_body}.

**CLIENT :** Sig. : ___ | Nom : {{CLIENT_SIGNATORY}} | Date : ___
**CONSULTANT :** Sig. : ___ | Nom : {{CONSULTANT_SIGNATORY}} | Date : ___`;

B['19-INV'] = (r, a) => `## PARTIES
**Société :** {{COMPANY_LEGAL_NAME}} | **Investisseur :** {{INVESTOR_LEGAL_NAME}}
**Date d'entrée en vigueur :** {{EFFECTIVE_DATE}}

---

## 1. INVESTISSEMENT
L'Investisseur investit ${r.currency} {{INVESTMENT_AMOUNT}} en échange de {{SECURITY_TYPE}} représentant {{OWNERSHIP_PERCENTAGE}} % de la Société sur une base entièrement diluée.

## 2. DÉCLARATIONS — INVESTISSEUR
L'Investisseur déclare : a) avoir le statut d'investisseur qualifié selon ${r.accredited_investor}; b) investir pour son propre compte; c) comprendre les restrictions applicables au transfert.

## 3. UTILISATION DU PRODUIT
{{USE_OF_PROCEEDS_DESCRIPTION}}.

## 4. PRÉFÉRENCE DE LIQUIDATION
L'Investisseur reçoit une préférence de liquidation de {{LIQUIDATION_MULTIPLE|1x}} avant toute distribution aux détenteurs d'actions ordinaires.

## 5. DISPENSE EN MATIÈRE DE VALEURS MOBILIÈRES
Placement effectué en vertu de ${r.securities_exemption}. Aucun prospectus n'est requis.

## 5.10. ACERBE™
Les empreintes AcerbE™ protègent tous les actifs numériques de la Société. L'altération par l'Investisseur d'une empreinte AcerbE™ sur tout actif de la Société : a) constitue un manquement grave; b) entraîne un rachat forcé au prix coûtant; c) peut contrevenir à ${a.circumvention} et à ${a.tradesecrets}.

## 6. DROIT APPLICABLE
${r.governing_law}. Arbitrage : ${r.arbitration_body}.

**SOCIÉTÉ :** Sig. : ___ | Nom : {{COMPANY_SIGNATORY}} | Titre : {{COMPANY_TITLE}} | Date : ___
**INVESTISSEUR :** Sig. : ___ | Nom : {{INVESTOR_SIGNATORY}} | Date : ___`;

function buildFrCa(docId) {
  const body = B[docId];
  if (!body) throw new Error(`No fr-CA builder for ${docId}`);
  const r = FR_RULES_CA, a = FR_ACERBE_CA;
  return [frontmatter(docId, r), header(docId, r), nb(body(r, a)), footer(r, a)].join('\n\n');
}

module.exports = { buildFrCa, FR_DOCS, FR_RULES_CA, FR_ACERBE_CA };
