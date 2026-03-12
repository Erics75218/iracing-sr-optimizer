# iRacing OAuth Client Registration – Form Data

Use this when filling out the form at:  
**https://oauth.iracing.com/oauth2/book/client_registration.html**

Choose the **“Other Client Types”** (non–Password Limited) request type so you can submit **Redirect URIs**.

---

## iRacing client (as of approval email)

| Field | Value on file with iRacing |
|-------|----------------------------|
| **client_id** | `sr-optimizer` |
| **Client Name** | SR Optimizer |
| **Client Type** | server-side |
| **Developer's Name** | Christopher Smith |
| **Developer's URL** | https://iracing-sr-optimizer-529tbmcxt-erics75218s-projects.vercel.app/ |
| **Developer Email** | erics75218@gmail.com |
| **Audiences** | data-server |

**Redirect URIs currently approved:**
- `https://vercel.com/erics75218s-projects/api/auth/iracing/callback` — Vercel dashboard URL; **not** where the app runs, so production Connect will fail.
- `http://127.0.0.1:3000/api/auth/iracing/callback` — **correct for local dev** (use `IRACING_REDIRECT_URI` in `.env` and open app at http://127.0.0.1:3000).

**Still needed for production:** Ask iRacing to **add** this redirect URI so “Connect to iRacing” works on the live app:

- `https://iracing-sr-optimizer.vercel.app/api/auth/iracing/callback`

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
| ↳ Local | `http://127.0.0.1:3000/api/auth/iracing/callback` |
| ↳ Production | `https://iracing-sr-optimizer.vercel.app/api/auth/iracing/callback` |
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
  http://127.0.0.1:3000/api/auth/iracing/callback
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
- For **local dev**, in `.env` set `IRACING_REDIRECT_URI=http://127.0.0.1:3000/api/auth/iracing/callback` and open the app at **http://127.0.0.1:3000** (not localhost).
- If you run the app on a **different port** (e.g. `http://127.0.0.1:3001`), the app uses that port in the callback URL. If Connect fails with **"unauthorized_client"**, add that exact URL in iRacing (OAuth client → Redirect URIs). The dashboard shows the callback URL this app is using so you can copy it.

---

## Official iRacing OAuth references

- **Authorize endpoint:** [oauth.iracing.com/oauth2/book/authorize_endpoint.html](https://oauth.iracing.com/oauth2/book/authorize_endpoint.html) — `client_id`, `redirect_uri` (must match exactly), `response_type=code`, PKCE `code_challenge` / `code_challenge_method=S256`, `state`, `scope`.
- **Token endpoint:** [oauth.iracing.com/oauth2/book/token_endpoint.html](https://oauth.iracing.com/oauth2/book/token_endpoint.html) — Authorization Code grant: `grant_type=authorization_code`, `client_id`, **masked** `client_secret`, `code`, same `redirect_uri`, `code_verifier`. Form body must be URL (percent) encoded. Client secret masking: SHA256(secret + normalized_id), then base64; for `client_secret` the id is `client_id`.
- **Password Limited (different flow):** [github.com/NickBaileyMA/irplc](https://github.com/NickBaileyMA/irplc) — example Python client for the Password Limited grant only; we use Authorization Code + PKCE.
