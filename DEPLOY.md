# Deploying iRacing SR Optimizer

## Where to host (pick one)

| Option | Best for | Free tier | Next.js |
|--------|----------|-----------|---------|
| **[Vercel](https://vercel.com)** | Easiest, built for Next.js | Yes | Native |
| **[Netlify](https://netlify.com)** | Simple, good DX | Yes | Supported |
| **[Railway](https://railway.app)** | Full-stack, add DB later | Yes (usage-based) | Supported |

**Recommendation: Vercel.** Connect your Git repo, push, and it builds and deploys. No server to manage.

---

## Deploy with Vercel (recommended)

### 1. Push your code to GitHub

If you haven’t already:

```bash
git init
git add .
git commit -m "Initial commit"
# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/iracing-sr-optimizer.git
git push -u origin main
```

### 2. Import the project on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub is easiest).
2. Click **Add New…** → **Project**.
3. Import your **iracing-sr-optimizer** repo.
4. Leave **Framework Preset** as Next.js and **Root Directory** as `.`. Click **Deploy**.
5. After the first deploy, you’ll get a URL like `https://iracing-sr-optimizer-xxx.vercel.app`.

### 3. Add environment variables on Vercel

1. In the project, go to **Settings** → **Environment Variables**.
2. Add (for **Production** and **Preview** if you want):

| Name | Value |
|------|--------|
| `IRACING_CLIENT_ID` | Your iRacing OAuth client ID |
| `IRACING_CLIENT_SECRET` | Your iRacing OAuth client secret |

Do **not** commit these; they stay in Vercel only.

### 4. Register the production URL with iRacing (one time)

When you [register your OAuth client](https://oauth.iracing.com/oauth2/book/client_registration.html) with iRacing, add **both** redirect URIs:

- `http://localhost:3000/api/auth/iracing/callback` (local)
- `https://YOUR_VERCEL_URL/api/auth/iracing/callback` (production)

Example: if Vercel gives you `https://iracing-sr-optimizer.vercel.app`, use:

- `https://iracing-sr-optimizer.vercel.app/api/auth/iracing/callback`

One approved client works for both local and production; no need to re-request.

### 5. Redeploy after adding env vars

In Vercel, go to **Deployments** → open the **⋯** on the latest deployment → **Redeploy** so the new env vars are used.

---

## Optional: custom domain (Vercel)

1. **Settings** → **Domains** → add your domain (e.g. `sr.iracing-tools.com`).
2. Follow Vercel’s DNS instructions.
3. Add that new callback URL to your iRacing OAuth client (you may need to ask iRacing to add a redirect URI after approval, or add it at registration if you know the domain in advance).

---

## Other hosts (Netlify / Railway)

- **Netlify:** New site → Import from Git → choose repo. Build command: `npm run build`. Publish directory: `.next`; use the **Next.js runtime** so Netlify runs `next start` for you (or their Next.js plugin).
- **Railway:** New project → Deploy from GitHub → select repo. Set build command `npm run build` and start command `npm start`. Add `IRACING_CLIENT_ID` and `IRACING_CLIENT_SECRET` in Variables.

In all cases, add your production callback URL (e.g. `https://your-app.netlify.app/api/auth/iracing/callback`) to your iRacing OAuth client’s redirect URI list.
