# Email Sorting Agent

Production-ready Next.js dashboard that classifies inbox messages into meaningful categories, explains every routing decision, and lets you simulate new scenarios in real time.

## Features

- Autonomous email classifier with work/finance/personal/promotion/spam taxonomies
- Transparent reasoning: keyword triggers, sender heuristics, confidence scoring, review queue
- Live scenario composer with instant classification preview
- Tailwind-powered dark UI optimized for Vercel deployment

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to explore the agent experience. Use the "Compose Scenario" tab to inject custom messages and see the classifier react instantly.

## Production

```bash
npm run build
npm run start
```

Deploy straight to Vercel with `vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-d872acdb`.

---

Built with Next.js 14, React 18, Tailwind CSS, and a deterministic heuristic engine—ready for further automation or integration.*** End Patch
