# Vercel auth debugging (login + Connect to iRacing)

## 1. Check what the app sees

**In the browser (same origin as your app):**

- Open: `https://YOUR_APP.vercel.app/api/debug/auth`

You’ll get JSON with:

- `host`, `origin`, `protocol` – request context
- `redirect_uri_we_use` – **must match exactly** in your iRacing OAuth client (no trailing slash)
- `is_production_host`, `production_redirect_approved` – on Vercel, `production_redirect_approved` must be `true`
- `oauth_env_configured` – Client ID and Secret set in Vercel env
- `cookies` – `has_id_cookie`, `has_oauth_access`, `connected`, etc. (no cookie values)
- `hints` – short checklist (e.g. add redirect URI, set `IRACING_PRODUCTION_URI_APPROVED=true`)

**From the command line (no cookies):**

```bash
PRODUCTION_URL=https://YOUR_APP.vercel.app npm run test:vercel-auth
# or
node scripts/test-vercel-auth.mjs https://YOUR_APP.vercel.app
```

This hits `/api/debug/auth` and `/api/auth/iracing/status` and prints the JSON. Use it to confirm redirect URI, production approved, and env configured.

## 2. Common fixes on Vercel

| Issue | Fix |
|-------|-----|
| **Login (ID) doesn’t stick** | Cookies are now set with `secure: true` on HTTPS. Ensure you use `https://` and the same domain (no mixing www vs non-www). |
| **Connect redirects to dashboard with error** | 1) In iRacing OAuth client, add the **exact** `redirect_uri_we_use` from `/api/debug/auth`. 2) In Vercel env, set `IRACING_PRODUCTION_URI_APPROVED=true`. |
| **After Connect, not connected** | Open `/api/debug/auth` in the **same** tab/session after the redirect. If `cookies.connected` is false, the callback may be failing (e.g. redirect URI mismatch or token exchange error). Check dashboard `?error=...`. |
| **401 unauthorized_client** | The redirect URI in the OAuth request doesn’t match iRacing. Set `IRACING_REDIRECT_URI` in Vercel to the same value you added in iRacing (e.g. `https://YOUR_APP.vercel.app/api/auth/iracing/callback`). |

## 3. Env vars on Vercel

- `IRACING_CLIENT_ID` – from iRacing OAuth client
- `IRACING_CLIENT_SECRET` – from iRacing OAuth client  
- `IRACING_REDIRECT_URI` – optional; if set, must match exactly what’s in iRacing (e.g. `https://YOUR_APP.vercel.app/api/auth/iracing/callback`)
- `IRACING_PRODUCTION_URI_APPROVED` – set to `true` so production host is allowed to use the redirect

## 4. Testing login and Connect in the browser

1. Open `https://YOUR_APP.vercel.app` (or `/login`).
2. Enter your iRacing ID and submit. You should land on the dashboard.
3. Open `https://YOUR_APP.vercel.app/api/debug/auth` in the **same** tab. Check `cookies.has_id_cookie === true`.
4. Click “Connect to iRacing”, complete iRacing login, and return to the app.
5. Open `/api/debug/auth` again. Check `cookies.connected === true`.

If step 3 or 5 fails, use `hints` and the table above to fix config, then redeploy.
