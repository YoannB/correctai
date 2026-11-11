# CorrectAI

Correcteur d'orthographe et de grammaire par IA, gratuit, qui corrige **la forme** (orthographe, accords,
conjugaison, ponctuation) sans toucher **au fond** : pas de reformulation, pas de résumé, pas de traduction. Le style,
le ton et le vocabulaire de l'auteur restent les siens.

Site en ligne : https://correctai-preview.netlify.app

## Ce que fait le site

- **Correction** : le texte (3 000 caractères max., la norme d'un post LinkedIn) est envoyé à un agent OpenRouter qui
  renvoie uniquement le texte corrigé et sa langue détectée. Les sauts de ligne, emojis, @mentions, #hashtags et URL
  sont conservés.
- **Diff et score** : les deux versions sont comparées mot à mot ; le score est le pourcentage de similarité entre le
  texte d'origine et le texte corrigé.
- **Verdict AI Act (art. 50)** : chaque modification est classée en _forme_ (faute de frappe, accent, casse,
  ponctuation) ou _fond_ (mot ajouté, supprimé ou remplacé par un autre). Corrections de forme uniquement → le texte
  reste celui de l'auteur, **prêt à publier** (exception « édition d'assistance ») ; au moindre changement de fond →
  une **mention « généré par IA »** est conseillée.
- **Exemples** pré-corrigés affichés sans appel IA, quota quotidien par utilisateur, six langues (français à la
  racine, puis `en`, `es`, `de`, `it`, `pt`).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Material UI 9 derrière une API neutre · `next-intl` 4 ·
OpenRouter via le Vercel AI SDK · Vitest, Playwright, Storybook 10 · Netlify.

CorrectAI est construit sur le boilerplate [Axons](https://github.com/YoannB/axons) : l'architecture, les conventions
et la documentation technique viennent de là. `AGENTS.md` et `docs/` sont la documentation (en anglais) d'Axons pour
les agents de code ; ils ne sont pas spécifiques à CorrectAI.

## Démarrage rapide

Prérequis : Node.js 24+ et npm.

```bash
git clone https://github.com/YoannB/correctai.git
cd correctai
npm ci
cp .env.example .env.local
npm run dev
```

(Sous PowerShell : `Copy-Item .env.example .env.local`.)

Puis ouvrir http://localhost:3000. Sans `OPENROUTER_API_KEY`, la couche IA est coupée (bouton de correction désactivé,
compteur et mentions masqués, `/api/run` répond 503) ; les exemples pré-corrigés restent consultables.

## Variables d'environnement

Référence complète et commentée : [`.env.example`](.env.example). Les principales :

| Variable                     | Rôle                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`         | Clé OpenRouter, serveur uniquement. Vide = IA désactivée. Lue aussi au build (sur Netlify : Builds + Functions). |
| `OPENROUTER_MODEL`           | Identifiant du modèle OpenRouter (défaut `openrouter/free`) ; à vérifier dans le catalogue au déploiement.       |
| `AI_QUOTA_SECRET`            | Secret HMAC des IP pour le quota serveur (≥ 32 caractères, **obligatoire en production**).                       |
| `AI_GLOBAL_DAILY_CAP`        | Plafond global d'appels IA par jour, toutes IP confondues (défaut 1000).                                         |
| `AI_RATE_PER_MIN`            | Rafale : appels max. par minute et par IP (défaut 2).                                                            |
| `NEXT_PUBLIC_SITE_URL`       | URL publique du site (canonical, hreflang, sitemap).                                                             |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `fr` : le français est servi à la racine.                                                                        |
| `NEXT_PUBLIC_LOCALES`        | Sous-ensemble des langues servies (vide = les six).                                                              |
| `NEXT_PUBLIC_AI_DAILY_LIMIT` | Corrections par jour et par utilisateur (côté client et côté serveur) ; 0 ou vide = fonction masquée.            |
| `NEXT_PUBLIC_AI_QUOTA_TZ`    | Fuseau IANA qui découpe la « journée » du quota (ex. `Europe/Paris`) ; vide = UTC.                               |
| `NEXT_PUBLIC_ADS_ENABLED`    | `false` tant que de vraies balises publicitaires ne sont pas branchées.                                          |
| `NEXT_PUBLIC_GTM_ID`         | Google Tag Manager (vide = non chargé). Le bandeau cookies n'existe que si GTM ou les pubs sont actifs.          |
| `LEGAL_*`                    | Informations éditeur des mentions légales (serveur uniquement) ; jamais de vraies valeurs dans le dépôt.         |

Le nom du site (`SITE_NAME`) et l'URL du dépôt sont déclarés une seule fois dans
[`constants/site.ts`](constants/site.ts).

## Où vit le code propre à CorrectAI

| Emplacement                                                                            | Contenu                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`app/[locale]/page.tsx`](app/[locale]/page.tsx)                                       | Page d'accueil : l'outil et ses blocs SEO.                               |
| `components/home/Corrector.tsx`, `CorrectorScore.tsx`                                  | Éditeurs, exemples, diff, score et verdict.                              |
| `components/home/ToolHero.tsx`, `ToolFeatures.tsx`, `SeoContent.tsx`                   | Accroche, points forts, contenu SEO (dont la section AI Act).            |
| [`lib/correct/verdict.ts`](lib/correct/verdict.ts)                                     | Classement forme/fond des modifications, verdict, lecture de la réponse. |
| [`constants/corrector.ts`](constants/corrector.ts)                                     | Limite de caractères, exemples, exemple par défaut, id de l'agent.       |
| [`capabilities/agents/correct.md`](capabilities/agents/correct.md)                     | Prompt et réglages de l'agent de correction.                             |
| `messages/*.json` (`corrector`, `toolHero`, `seoContent`, `toolFeatures`, `meta.home`) | Textes de l'outil dans les six langues.                                  |

Le diff et la similarité génériques (`lib/text/`) et la route IA unifiée (`/api/run`, `lib/ai/`) viennent d'Axons.

## Contrôle qualité

À lancer avant toute PR (c'est aussi ce que la CI exécute sur les PR vers `main`) :

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build && npm run test:e2e && npm run storybook:build
```

Plus `npm audit`. Le formatage est géré par Prettier (`npm run format`).

## Déploiement

Le site Netlify est lié à `main` : chaque merge déclenche un déploiement automatique (adaptateur Next.js de Netlify, Node
24). Les variables d'environnement se règlent dans Netlify > Site configuration > Environment variables.
`main` est protégée : passer par une branche et une PR.

## Récupérer les mises à jour d'Axons

Le dépôt Axons est configuré comme remote `upstream` :

```bash
git remote add upstream https://github.com/YoannB/axons.git   # une seule fois
git fetch upstream --tags
git merge vX.Y.Z        # ou : git merge upstream/main
```

En cas de conflit :

- garder la version CorrectAI de `messages/*.json` et de `app/[locale]/page.tsx` ;
- relire `constants/site.ts` : un merge peut y dupliquer des blocs (constantes déclarées deux fois).

Puis relancer le contrôle qualité complet avant d'ouvrir la PR.

## Licence

Copyright (C) 2026 Yoann Barbier. Logiciel libre sous licence **GNU AGPL v3.0 only** (`AGPL-3.0-only`) : voir
[`LICENSE`](LICENSE). Toute version modifiée exploitée comme service en ligne doit publier son code source sous la même
licence.
