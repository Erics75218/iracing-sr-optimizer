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

## 5. Run tests before deploy

You can run an integration test locally or against a deployment to verify login and state behavior:

```bash
# Start the app (if testing locally)
npm run dev

# In another terminal: test that login sets cookie and next request sees it
npm run test:auth-flow

# Against Vercel (no dev server needed): same test
BASE_URL=https://iracing-sr-optimizer.vercel.app npm run test:auth-flow
```

- **Locally:** The script also hits `/api/debug/state-roundtrip` (dev-only) to verify OAuth state round-trips the iRacing ID.
- **Vercel:** If `test:auth-flow` fails on the production URL, cookies may not be persisting (e.g. domain, secure, or SameSite).

## 6. After Connect: why is my ID gone?

If Connect to iRacing works but the app no longer shows your iRacing ID:

1. **Check the callback response**  
   In DevTools → Network, after returning from iRacing, select the request to `/api/auth/iracing/callback`. In the **response headers** look for `X-Debug-ID-Source`:
   - `api` – ID came from iRacing member/info (expected when you’re logged into iRacing).
   - `state` – ID was restored from the OAuth state (used when the callback request had no cookies).
   - `cookie` – ID came from the cookie sent to the callback.
   - `none` – No ID was set (so you’ll see “Enter iRacing ID” again).

2. If you see **`none`**, the ID was never in state. That usually means when you clicked “Connect to iRacing”, the request to `/api/auth/iracing/authorize` did **not** send the `iracing_id` cookie. So either the login cookie wasn’t stored (try the same URL for login and Connect, and use HTTPS on Vercel), or you’re on a different host (e.g. www vs non-www).

3. Run **`npm run test:auth-flow`** against your Vercel URL. If it passes, the server is setting and reading the login cookie correctly; the issue is then likely browser/host (same URL for login and Connect).
