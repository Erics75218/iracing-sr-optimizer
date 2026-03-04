# iRacing SR Optimizer

Get race recommendations to maximize your Safety Rating based on track corner density and race length.

- **Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Auth:** iRacing ID (cookie) + iRacing OAuth2 for the Data API

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: add IRACING_CLIENT_ID and IRACING_CLIENT_SECRET (see .env.example)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter your iRacing ID, then **Connect to iRacing** so the app can call the iRacing Data API.

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for hosting options (Vercel, Netlify, Railway) and step-by-step deployment.
