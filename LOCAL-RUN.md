# Run the app locally (step-by-step)

Do this from the **project root**: `iracing-sr-optimizer` (where `package.json` lives).

---

## 1. Open terminal in the project folder

```bash
cd /Users/christophersmith/Documents/iracing-sr-optimizer
```

(Or in VS Code/Cursor: **Terminal → New Terminal** — it usually opens in the workspace root.)

---

## 2. Install dependencies (if needed)

```bash
npm install
```

You should see `node_modules` and no errors. Run this after cloning or if you added packages.

---

## 3. Clean old build and cache

```bash
rm -rf .next
```

This forces a fresh build so styles and code aren’t stale.

---

## 4. (Optional) Free port 3000 if something else is using it

If a previous dev server or another app is on port 3000, either close it or run:

```bash
# See what’s on port 3000 (Mac/Linux)
lsof -i :3000
```

To stop a Node/Next process using 3000, note the PID from the output and run:

```bash
kill <PID>
```

Then start the dev server (step 5). If you skip this, Next may start on another port (e.g. 3002) — use the URL it prints.

---

## 5. Start the dev server

```bash
npm run dev
```

Wait until you see:

- `✓ Ready in ...`
- `- Local: http://localhost:3000` (or `http://localhost:3002` if 3000 was in use)

**Use the URL shown in the terminal.** Leave this terminal open; the server must keep running.

---

## 6. Open the app in your browser

Use the URL from the terminal, usually:

**http://localhost:3000**

(If Next started on another port, use that, e.g. **http://localhost:3002**.)

- Use **http** (not https).
- Use **localhost** or **127.0.0.1**; use the **same port** the terminal shows (e.g. 3001). The app keeps all links and OAuth redirects on that port.
- If you use a different port (e.g. 3001), add that callback in iRacing: `http://127.0.0.1:3001/api/auth/iracing/callback`.

---

## 7. Hard refresh so you don’t use cached CSS

- **Mac:** `Cmd + Shift + R`
- **Windows/Linux:** `Ctrl + Shift + R`

Or open the site in a **private/incognito** window.

---

## Quick checklist

| Step | Command / action |
|------|-------------------|
| 1 | `cd` to project root (`iracing-sr-optimizer`) |
| 2 | `npm install` |
| 3 | `rm -rf .next` |
| 4 | (Optional) Free port 3000: `lsof -i :3000` then `kill <PID>` if needed |
| 5 | `npm run dev` |
| 6 | Open the URL from the terminal (e.g. **http://localhost:3000**) |
| 7 | Hard refresh (Cmd+Shift+R or incognito) |

---

## If it still looks wrong

- Confirm the terminal shows **Next.js** and **Ready** (no compile errors).
- In the browser: **F12 → Console** — check for red errors.
- In **F12 → Network**: reload and confirm the main document and JS/CSS requests return **200** (not blocked or 404).
