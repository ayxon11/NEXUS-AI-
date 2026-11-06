# NEXUS AI 0.9.0 — flux de marché multi-sources

NEXUS AI est une application web locale en français, conçue pour Mac et iPhone. Elle combine un tableau de bord futuriste, un flux crypto multi-sources avec bascule automatique et un assistant IA Gemini facultatif.

## Nouveautés 0.9.0

- Flux de marché multi-sources : CoinGecko en priorité, CoinCap en second fournisseur, Binance public en troisième secours.
- Limitation CoinGecko gérée avec une pause automatique de cinq minutes après une réponse HTTP 429, afin de ne pas marteler un fournisseur qui vient de limiter l'application.
- Les cours instantanés restent disponibles même si l'historique horaire échoue ; les indicateurs non calculables restent explicitement indisponibles.
- Historique mis en cache cinq minutes ; cours rafraîchis environ chaque minute et actualisation manuelle disponible.
- Le Centre Neural indique la source réellement utilisée, le cache de secours et la disponibilité de l'historique.
- Le cerveau IA reçoit le nom de la source et les indicateurs issus du dernier instantané disponible.
- Binance fournit des paires USDT ; leur affichage en référence USD est approximatif et cette limite est signalée.

## Nouveautés 0.8.0

- Activation des alertes de prix locales : seuil au-dessus/en-dessous, sauvegarde dans le navigateur, déclenchement au rafraîchissement des cours. Les alertes ne fonctionnent que lorsque le site reste ouvert.
- Module Documents : import local de fichiers texte et code (TXT, MD, CSV, JSON, JS, TS, HTML, CSS, PY, LOG), aperçu et envoi volontaire du contenu au chat Gemini pour analyse. Limite 500 Ko ; PDF, Word et images non pris en charge.
- Atelier Programmation : éditeur de code intégré avec actions IA pour expliquer, déboguer et améliorer un extrait.
- Navigation et états des modules mis à jour ; les limites fonctionnelles sont affichées plutôt que de simuler des capacités inexistantes.

## Nouveautés 0.6.0

- Nouveau module cerveau (`server/brain.js`) : routage des demandes vers des modes crypto, code, comparaison, pédagogie, planification ou général.
- Instructions Gemini renforcées : méthode de résolution structurée, séparation faits/déductions/inconnues, limites d'accès explicites et protection contre les demandes de divulgation des instructions internes.
- Synthèse quantitative du marché suivi injectée dans le contexte IA, calculée uniquement depuis les indicateurs reçus.
- Tests unitaires du routage, du résumé de marché et des consignes IA.
- Ajout du fichier `.env.example` attendu par la procédure d'installation.

## Nouveautés 0.5.0

- Watchlist élargie à 10 actifs CoinGecko : BTC, ETH, SOL, XRP, DOGE, BNB, ADA, AVAX, LINK et TRX.
- Recherche dans les actifs suivis, filtre des favoris et favoris persistés localement.
- Actualisation manuelle du marché depuis le tableau de bord.
- Raccourcis de prompts pour guider l’assistant dans les comparaisons, synthèses et explications.
- Consignes Gemini renforcées : séparer observations, hypothèses et inconnues ; scénarios conditionnels sans probabilités ni objectifs inventés.

## Nouveautés 0.3.0

- Synthèse de marché calculée depuis les variations 24 h réellement reçues : nombre d’actifs en hausse/en baisse, meilleure et plus faible performance.
- Qualité des données indicatrices : historique complet ou limité, sans remplacer les valeurs manquantes par des estimations.
- Tests supplémentaires sur les prix invalides, les historiques courts et les valeurs RSI.

## Cerveau IA : portée réelle

Le routage adapte les consignes au type de demande ; il ne s'agit pas de plusieurs modèles indépendants. La mémoire de conversation reste l'historique local envoyé avec les derniers messages. NEXUS n'a pas d'accès général au web, aux fichiers de l'ordinateur, ni d'agent autonome capable d'agir sur des comptes. Ces fonctions nécessiteraient des connecteurs et des autorisations dédiés.

## Fonctions réellement actives

- Cours USD de Bitcoin (BTC), Ethereum (ETH), Solana (SOL), XRP et Dogecoin (DOGE), via CoinGecko, avec CoinCap et Binance comme fournisseurs de secours.
- Actualisation de l'interface toutes les 60 secondes et cache serveur de 30 secondes. En cas de panne temporaire du fournisseur, le dernier instantané connu peut être affiché et est signalé comme ancien.
- Graphique historique 24 heures / 7 jours à partir de l’endpoint historique CoinGecko `market_chart` (rafraîchi toutes les 5 minutes en cache).
- Variation 24 h fournie par CoinGecko et variation 7 jours calculée depuis l'historique disponible.
- Moyenne mobile des 24 derniers points horaires, RSI approximatif sur 14 variations horaires, volatilité des variations horaires et étiquette de tendance descriptive, calculés à partir de l’historique `market_chart` plutôt que de la sparkline de 7 jours (qui est actualisée beaucoup moins souvent).
- Assistant Gemini facultatif : le serveur lui transmet l'instantané du marché et les indicateurs afin qu'il puisse les expliquer. Si la clé manque, le flux crypto reste utilisable.
- Historique de conversation conservé localement dans le navigateur.

## Comprendre les indicateurs

- **Variation 24 h / 7 j** : évolution du prix sur la période indiquée.
- **MM 24H** : moyenne arithmétique des 24 derniers points horaires disponibles. Le prix au-dessus ou en dessous ne garantit pas la suite.
- **RSI 14 horaire** : calcul sur les 14 dernières variations horaires disponibles. C'est une approximation horaire, pas le RSI journalier standard. Une valeur au-dessus de 70 est souvent appelée zone de surachat et sous 30 zone de survente ; ce ne sont pas des signaux automatiques.
- **Volatilité horaire** : écart-type des dernières variations horaires, non annualisé. Elle décrit l'amplitude récente, pas la direction.
- **Tendance** : règle descriptive simple combinant la variation 24 h et la position du prix par rapport à MM 24H. Si une donnée nécessaire manque, l'étiquette reste « mixte ».

## Éléments qui ne sont PAS actifs

Le noyau neural animé est une illustration. Les panneaux de charge CPU/mémoire et les événements système d’exemple sont décoratifs : ils ne mesurent pas le Mac. Le module portefeuille ne calcule pas de risque personnel ni de portefeuille réel. NEXUS ne connaît pas ton portefeuille et n'exécute aucun achat ou vente.

## Installation sur Mac

1. Installe **Node.js 20 ou plus récent** depuis <https://nodejs.org/>.
2. Décompresse l'archive et ouvre le dossier `nexus-ai` dans Visual Studio Code.
3. Ouvre le terminal dans ce dossier et exécute :

```bash
npm install
```

4. Copie `.env.example` vers un fichier nommé `.env`.
5. Pour activer l'assistant, crée une clé Google AI Studio sur <https://aistudio.google.com/app/apikey> et renseigne-la dans `.env` :

```env
GEMINI_API_KEY=ta_cle_personnelle
GEMINI_MODEL=gemini-3.1-flash-lite
PORT=8787
```

La clé est utilisée uniquement par le serveur local. Ne la colle jamais dans le code React et ne la partage pas. Tu peux laisser la valeur d'exemple si tu veux seulement consulter les marchés.

6. Lance l'application :

```bash
npm run dev
```

7. Ouvre <http://localhost:5173> sur le Mac.

## Utilisation sur iPhone

- Connecte l'iPhone et le Mac au même réseau Wi-Fi.
- Laisse le serveur de développement tourner sur le Mac.
- Trouve l'adresse IP locale du Mac dans Réglages Système → Wi-Fi → Détails, puis ouvre `http://ADRESSE-IP-DU-MAC:5173` dans Safari sur l'iPhone.
- Dans Safari, utilise Partager → Sur l'écran d'accueil pour créer un raccourci de type application.

Cette version est un prototype local : le Mac doit rester allumé et l'application lancée pour que l'iPhone puisse y accéder. Pour un accès depuis n'importe où, il faudra un hébergement HTTPS et sécuriser le serveur avant toute publication.

## Vérification et construction

```bash
npm test
npm run build
```

Les tests automatisés vérifient les calculs des indicateurs. La commande de build vérifie TypeScript puis crée la version de production dans `dist/`.

## Coûts et limites

- CoinGecko : endpoint public sans clé dans cette version ; limites d'appels et disponibilité soumises au fournisseur.
- Gemini : clé API nécessaire pour le chat. Les quotas et éventuels coûts dépendent des conditions de Google AI Studio ; ne configure aucune facturation si tu souhaites rester à 0 €.
- Les données peuvent être retardées, incomplètes ou indisponibles. L'IA doit le signaler et ne pas inventer de valeurs.
- Les analyses sont informatives et pédagogiques, pas un conseil financier ni une prédiction.
- Le serveur local n'a pas de compte utilisateur ni d'authentification. Ne l'expose pas sur Internet tel quel.

## Dépannage

- `npm: command not found` : installe Node.js puis rouvre le terminal.
- Le marché ne charge pas : vérifie Internet et réessaie plus tard ; CoinGecko peut limiter les requêtes.
- Le chat indique que la clé manque : vérifie le fichier `.env`, puis redémarre `npm run dev`.
- Erreur Gemini/quota : vérifie la clé et les limites affichées dans AI Studio.


## Références techniques

- Modèle IA par défaut : [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).
- Historique crypto : endpoint CoinGecko `coins/{id}/market_chart` ; la sparkline du endpoint marchés est évitée car elle n’est pas rafraîchie assez souvent pour servir de base à des indicateurs horaires.


## Catalogue crypto (v1.0.0)

Le scanner charge automatiquement jusqu’aux 500 premières cryptomonnaies classées par capitalisation via CoinGecko (2 pages de 250 actifs). CoinCap fournit un catalogue de secours jusqu’à 500 actifs. Les historiques détaillés sont limités aux 30 premiers actifs afin de préserver les quotas des API ; les autres cours restent consultables, mais leurs indicateurs historiques sont indiqués comme indisponibles tant qu’un historique n’est pas récupéré.


## Catalogue crypto (v1.1.0)

- CoinGecko charge jusqu’à 1 000 cryptomonnaies (4 pages de 250), classées par capitalisation.
- CoinCap conserve un catalogue de secours jusqu’à 500 actifs.
- Si les deux premières sources sont indisponibles, Binance fournit un catalogue de secours élargi couvrant plusieurs dizaines de grandes paires USDT, au lieu de rester limité aux 10 actifs initiaux.
- Dans l’onglet « Marchés crypto », la barre de recherche est mise en évidence et filtre instantanément les actifs par nom ou symbole. Le nombre de résultats est affiché.
- Les historiques détaillés restent limités aux 30 premiers actifs pour préserver les quotas des API ; les cours des autres actifs restent consultables, mais leurs indicateurs historiques peuvent être indisponibles.
- Les cours Binance en USDT sont une approximation de l’USD ; ce point est signalé dans les avertissements du flux.


## Version 1.3.1 — graphiques sur tout le catalogue

- Les mini-graphiques 7 jours sont récupérés directement avec les données de marché CoinGecko pour chaque actif du catalogue (jusqu’à 1 000), sans effectuer un appel historique séparé par crypto.
- Chaque ligne de crypto conserve son bouton GRAPHIQUE : le graphique détaillé est chargé à la demande pour l’actif choisi, avec les périodes 24 h, 7 j, 30 j, 90 j et 1 an.
- Les historiques ne sont plus préchargés uniquement pour les 30 premiers actifs lorsque CoinGecko fournit les sparklines.


## Modèle économique gratuit — v1.5.0

- Toutes les fonctionnalités sont accessibles gratuitement : cours crypto, graphiques, recherche, favoris, alertes, indicateurs, documents, programmation et assistant IA.
- Aucun abonnement, aucun paiement utilisateur et aucune intégration PayPal/Stripe.
- Quotas IA anti-abus côté serveur : 5 messages/jour sans compte et 25 messages/jour avec un compte gratuit. Ils se réinitialisent chaque jour UTC et servent à maîtriser les coûts des appels au fournisseur IA ; ils ne créent pas de forfait payant.
- Emplacement partenaire configurable avec `NEXUS_PARTNER_NAME` et `NEXUS_PARTNER_URL`. Seules les URL HTTPS sont acceptées. Les clics sont enregistrés localement dans `.data/members.json` comme statistiques indicatives.
- Les emplacements publicitaires sont prévus dans l'interface, mais aucun réseau publicitaire n'est intégré par défaut. Il faut accepter un réseau, configurer ses identifiants et mettre en place le consentement publicitaire/cookies avant d'obtenir des revenus publicitaires.
- Les liens d'affiliation ne rapportent une commission que si un programme partenaire est accepté et si l'utilisateur réalise l'action éligible. Les revenus ne sont pas garantis et doivent être signalés clairement.

### Configuration d'un partenaire

1. Ouvre `.env` et renseigne `NEXUS_PARTNER_NAME` avec le nom du partenaire.
2. Renseigne `NEXUS_PARTNER_URL` avec ton lien d'affiliation officiel en HTTPS.
3. Redémarre NEXUS. Le lien partenaire apparaîtra dans l'espace Monétisation et sur les autres écrans ; les clics seront comptabilisés localement.
4. N'ajoute que des liens autorisés par le programme d'affiliation. Ne promets aucun rendement financier.

### Limites avant mise en production

Cette version est une base fonctionnelle pour développement et test local, pas encore une plateforme commerciale prête à accueillir du public. Les comptes sont conservés dans `.data/members.json` : il faut remplacer ce stockage fichier par une base de données gérée (PostgreSQL, par exemple) avant un déploiement multi-instance. Prévoir également vérification d'e-mail, récupération de mot de passe, limitation anti-abus des routes d'authentification, sauvegardes, journalisation, politique de confidentialité, conditions de vente, gestion des cookies/consentements publicitaires et conformité RGPD/droit de rétractation en France/UE. Avant toute ouverture publique, configure un domaine HTTPS, une base de données adaptée, une politique de confidentialité et les mécanismes de consentement nécessaires aux cookies et publicités.

Les analyses crypto restent informatives et ne constituent pas un conseil financier. Les liens d’affiliation doivent être clairement signalés et ne doivent pas promettre de rendement.
