# Tradie — Mobile (Expo)

App mobile de réservation et facturation pour indépendants et petites entreprises, toutes professions confondues — artisanat & BTP, beauté & bien-être, services professionnels. Devis, rendez-vous, factures et paiements, en français et en anglais.

## Stack

| | |
|---|---|
| Framework | Expo SDK 54 (managed workflow) |
| Routing | `expo-router` v6, file-based, typed routes activées |
| UI | React 19.1.0 / React Native 0.81.5 |
| Auth | Clerk (`@clerk/clerk-expo`) |
| Données | Supabase (`@supabase/supabase-js`) |
| Stockage local | `expo-secure-store` + `@react-native-async-storage/async-storage` |
| i18n | moteur maison (`src/hooks/i18n/`), anglais / français |
| Devise | Euro (€) partout, via `fmt()` dans `src/styles/tokens.js` |
| Build & distribution | EAS (`eas.json`) |

## Prérequis

- Node.js
- Un compte [Expo](https://expo.dev) (pour EAS build/submit)
- Un projet [Supabase](https://supabase.com)
- Un compte [Clerk](https://dashboard.clerk.com)

## Installation

```bash
npm install
cp .env.example .env
# puis renseigner les clés dans .env — voir ci-dessous
npx expo start
```

`expo start` propose ensuite de lancer sur iOS, Android ou web (`npm run ios` / `npm run android` / `npm run web` font la même chose directement).

## Variables d'environnement

Toutes préfixées `EXPO_PUBLIC_` — ce sont des clés publiques, faites pour être embarquées côté client, aucun secret backend n'est stocké dans l'app :

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Clerk — dashboard.clerk.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

`.env` est ignoré par git (voir `.gitignore`) et n'est pas inclus dans les archives partagées — ne jamais commit tes propres clés, seul `.env.example` est versionné.

## Identifiants app

- iOS bundle id / Android package : `app.tradie.mobile`
- Scheme (deep links) : `tradie`
- EAS project id : `85787e1d-b789-4156-b10b-7f669c2df438`
- Couleur de marque (splash / icône adaptive) : `#E8500A`

## Build (EAS)

Trois profils configurés dans `eas.json` :

```bash
eas build --profile development   # dev client, distribution interne
eas build --profile preview       # distribution interne
eas build --profile production    # version incrémentée automatiquement
eas submit --profile production
```

## Structure

```
assets/
  icon.png
  splash.png
  adaptive-icon.png
  favicon.png

app/
  _layout.js                  # racine — ClerkProvider, pont Clerk → Supabase, Stack racine
  index.js                    # redirige vers (tabs) ou (auth)/sign-in selon l'état Clerk
  (auth)/
    _layout.js
    sign-in.js
    sign-up.js
  (tabs)/
    _layout.js                # barre d'onglets — Home / Jobs / Clients / Invoices / More
    index.js                   # Dashboard
    jobs.js
    clients.js
    invoices.js
    marketplace.js             # onglet masqué, accessible via More
    settings.js                # onglet masqué, accessible via l'avatar du Dashboard
    more.js
  (screens)/
    _layout.js
    quotes.js
    payments.js
    reviews.js
    certifications.js
    referrals.js
    booking.js                  # + gestion du catalogue d'options réservables (photo, prix)

src/
  components/
    UI.js                      # Btn, Badge, Avatar, Card, Field, Input, MetricCard,
                                 # EmptyState, Spinner, Divider, Sheet, ConfirmSheet,
                                 # Toggle, SettingRow, InfoRow, SelectPicker
  hooks/
    useLanguage.js              # wrapper mobile du moteur i18n (persistance SecureStore)
    useProfile.js                # profil Clerk + Supabase, retry auto sur erreurs réseau
    i18n/
      index.js                    # t(), useTranslation(), setLanguage()...
      en.js
      fr.js
  lib/
    supabase.js                  # client Supabase, token forwarded depuis Clerk
    db.js                         # tous les appels DB
    notifications.js              # emails (Resend) et SMS (Twilio) via Edge Functions
    professions.js                 # verticals, professions, terminologie par métier
    withTimeout.js
  styles/
    tokens.js                      # design tokens (T, SS), formatters (fmt en €, fmtDate...)

supabase/
  migrations/
    004_service_options.sql      # table service_options + bucket "booking-images"
```

## Catalogue d'options réservables

Onglet **Options** dans `app/(screens)/booking.js` : chaque profil peut créer des options réservables (titre, description, prix, photo) affichées sur sa page de réservation publique — les clients en choisissent une, ou envoient une demande sur-mesure. Gestion complète (ajout/édition/suppression/photo) côté app ; l'affichage et la sélection côté client vivent sur la page web publique (`PublicBookingPage.jsx`, hors de ce repo).

- Migration à exécuter sur Supabase : `supabase/migrations/004_service_options.sql` — crée la table `service_options` et le bucket de stockage `booking-images`.
- Dépendance ajoutée : `expo-image-picker`, avec le plugin correspondant dans `app.json` (message de permission photo en français).
- `db.js` expose `getServiceOptions`, `createServiceOption`, `updateServiceOption`, `deleteServiceOption`, `uploadOptionImage`.

## i18n

Moteur maison dans `src/hooks/i18n/` — `en.js`/`fr.js` + `index.js` qui expose `t()` et le hook `useTranslation()`. Chaque écran importe soit `useTranslation` (`src/hooks/i18n/index.js`) soit `useLanguage` (`src/hooks/useLanguage.js`, un wrapper au-dessus qui gère la persistance via SecureStore) — les deux lisent le même dictionnaire.

Toutes les clés `t("...")` réellement appelées par les 14 écrans de l'app ont été vérifiées automatiquement contre `en.js` et `fr.js` : aucune clé manquante, aucune clé dupliquée, dans les deux langues.

## Devise

Tout passe par `fmt()` dans `src/styles/tokens.js`, qui affiche les montants en euro (`1 234,56 €`). Comme tous les écrans (jobs, factures, devis, paiements, clients, marketplace, matériaux) utilisent cette même fonction, changer la devise ne se fait qu'à cet endroit.

## Notes techniques

- **Pas de plugin Reanimated dans `babel.config.js`, volontairement.** `react-native-reanimated` n'est présent que comme dépendance transitive de `react-native-gesture-handler` — rien dans le code ne l'importe directement. Si un écran futur a besoin d'animations Reanimated, il faudra installer `react-native-worklets` et ajouter `'react-native-worklets/plugin'` (pas `'react-native-reanimated/plugin'`, obsolète depuis Reanimated 4) en dernier plugin.
- **`.gitignore` exclut `ios/` et `android/`** → le projet reste en managed workflow, pas de dossiers natifs générés à committer.

## Scripts

```bash
npm run start     # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web         # expo start --web
```
