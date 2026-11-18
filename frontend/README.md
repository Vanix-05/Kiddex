# KIDDEX frontend

React + TypeScript + Vite. In development, `npm run dev` opens http://localhost:5173 and Vite passes every `/api/...` call to the backend at http://localhost:3000 (start it with `npm run dev` in `backend/`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the site at http://localhost:5173 for development. |
| `npm run build` | Checks the TypeScript and builds the site into `dist/`. |
| `npm run preview` | Serves the built `dist/` at http://localhost:4173 to try it. |
| `npm run lint` | Checks the code style. |
| `npm run test` | Runs the tests (Vitest). |

## Admin page (`/admin`)

The Admin page manages **Teacher accounts only**: add a Teacher, reset a password, turn an account off or on. Open `https://<your-site>/admin` (or http://localhost:5173/admin) and log in with an admin account made with `npm run add-admin` in `backend/`.

- **There is no link to it anywhere in the app**, on purpose: type the address yourself.
- It is its own download (`src/admin/`), so Students and Teachers never load it.
- It has its own login, kept in sessionStorage under its own key (`kiddex.adminToken`), separate from the Teacher login. Closing the tab logs the admin out.
- It works on phones held **upright** and sideways, and on laptops: the "Turn your phone sideways" screen never shows on `/admin` pages (`src/routes/pageArea.ts` sets `data-area="admin"` on `<html>` from the address, so it never flashes).

## Deploy on Vercel

1. New Project → import the GitHub repository.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Environment Variables:** `VITE_API_URL` = the Render address of the backend, **with no slash at the end**, e.g. `https://kiddex-api.onrender.com`.
7. Deploy. Then put the Vercel address (e.g. `https://kiddex.vercel.app`) in `FRONTEND_URL` on Render, or the browser blocks the calls (CORS).

Good to know:

- **`VITE_API_URL` is read when the site is BUILT**, not when it runs: it is written into the built files. After changing it on Vercel you must **redeploy** (Deployments → ⋯ → Redeploy) before it takes effect.
- Every backend call goes through `src/teacher/api/client.ts` (`API_URL` = `VITE_API_URL`), including the Teacher login, `/api/auth/me` and the lesson upload.
- `vercel.json` sends every page address (like `/teacher/lessons` or `/lobby`) to the app, so reloading a page or opening a shared link works instead of showing a 404. Real files (`/assets/...`, `favicon.svg`, the pictures and videos) are still served as they are: Vercel only uses the rewrite when no file matches.
- The free backend sleeps when nobody uses it. The first login after a break can take up to about a minute; after 5 seconds Teacher Login shows "Waking up KIDDEX… this can take up to a minute." The login waits up to 75 seconds.

---

## About the Vite template

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
