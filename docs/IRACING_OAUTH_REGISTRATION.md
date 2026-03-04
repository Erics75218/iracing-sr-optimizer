# iRacing OAuth Client Registration – Form Data

Use this when filling out the form at:  
**https://oauth.iracing.com/oauth2/book/client_registration.html**

Choose the **“Other Client Types”** (non–Password Limited) request type so you can submit **Redirect URIs**.

---

## Copy-paste values

Replace any `YOUR_*` placeholders with your real info before submitting.

| Field | Value |
|-------|--------|
| **Client Name** | `iRacing SR Optimizer` |
| **Client Type** | `server-side` (or the option that allows Redirect URIs — e.g. server-side web app / authorization code; do **not** choose password_limited) |
| **Developer Name** | `YOUR_NAME_OR_APP_NAME` |
| **Developer URL** | `https://iracing-sr-optimizer.vercel.app` *(or your real Vercel URL, e.g. `https://iracing-sr-optimizer-xxxx.vercel.app`)* |
| **Developer Email** | `YOUR_EMAIL@example.com` |
| **Redirect URIs** | *(add both of these as separate URIs)* |
| ↳ URI 1 | `http://localhost:3000/api/auth/iracing/callback` |
| ↳ URI 2 | `https://iracing-sr-optimizer.vercel.app/api/auth/iracing/callback` *(replace with your actual Vercel URL if different)* |
| **Audiences** | `data-server` |

---

## Example (filled)

```
Client Name:        iRacing SR Optimizer
Client Type:        server-side   (or: server-side web app / authorization code — whatever allows Redirect URIs)
Developer Name:     Eric Smith
Developer URL:      https://iracing-sr-optimizer.vercel.app
Developer Email:    eric@example.com

Redirect URIs:
  http://localhost:3000/api/auth/iracing/callback
  https://iracing-sr-optimizer.vercel.app/api/auth/iracing/callback

Audiences:          data-server
```

---

## After you submit

- iRacing may take up to ~10 days to approve.
- When approved, they’ll send you a **Client ID** and **Client Secret**.
- Add those to:
  - **Vercel:** Settings → Environment Variables → `IRACING_CLIENT_ID`, `IRACING_CLIENT_SECRET`
  - **Local:** `.env` in the project root with the same names.
- If your **production** URL is different (e.g. `https://iracing-sr-optimizer-abc123.vercel.app`), use that exact host in the second Redirect URI when you register.
