# Chinese Dota 2 Tier 1 Players – 2025

This Next.js application ships with a ready-to-deploy snapshot of Chinese Dota 2 professionals who appeared on Liquipedia Tier 1 tournament rosters during 2025. The dataset is stored locally (`data/chinese_players_2025.json`) and can be regenerated from Liquipedia using `scripts/generate-data.ts` when API rate limits allow.

## Local Development

```bash
npm install
npm run dev
```

## Updating the Dataset

```bash
npx tsx scripts/generate-data.ts
```

> The generator performs sequential requests against Liquipedia through the `r.jina.ai` proxy. Hitting rate limits will cause partial output, so rerun the script if necessary.

## Production Build

```bash
npm run build
npm start
```

## Deployment

Deploy directly to Vercel using the provided production token:

```bash
vercel deploy --prod --yes --token "$VERCEL_TOKEN" --name agentic-a141ca82
```
