<div align="center">

<img src="public/favicon.svg" width="72" height="72" alt="JSRadar logo" />

# JSRadar

### Browser-based JavaScript vulnerability scanner

**Detect CVEs, prototype pollution, missing SRI, and hardcoded secrets — entirely in your browser. No backend. No account. Nothing stored.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22FFA2?style=flat-square)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com)

[**Live demo**](https://js-radar.pages.dev) &nbsp;·&nbsp; [Report a bug](../../issues) &nbsp;·&nbsp; [Request a feature](../../issues)

</div>

---

## What is JSRadar?

JSRadar fetches JavaScript files from any GitHub, GitLab, or Bitbucket repository — or directly from a public web page — and runs five independent security scanners against them. Everything executes client-side: your tokens never leave the browser and no data is sent to any third-party server.

---

## Scanners

| # | Scanner | Data source | What it catches |
|---|---------|-------------|-----------------|
| 1 | **retire.js** | [RetireJS database](https://github.com/RetireJS/retire.js) | Known CVEs in 500+ front-end libraries (jQuery, Bootstrap, Angular, Lodash, Moment.js, and more). Matches by version fingerprint against NVD-sourced vulnerability ranges. |
| 2 | **GSAP CVE-2020-28478** | NVD / custom PoC port | Prototype pollution in GreenSock Animation Platform < 3.6.0. Extracts version strings from GSAP source and flags affected builds. |
| 3 | **OSV.dev** | [Google OSV](https://osv.dev) batch API | Second-pass CVE lookup via the Open Source Vulnerabilities database (aggregates GitHub Advisory Database + npm advisories). Catches advisories published after the retire.js database was last updated. |
| 4 | **SRI Checker** | W3C SRI spec / HTML parsing | External `<script>` and `<link>` tags without a valid `integrity` attribute. Explicitly flags `polyfill.io` — compromised in the 2024 supply-chain attack affecting 100,000+ sites. |
| 5 | **Secrets Scanner** | Custom regex engine | Hardcoded Google API keys, AWS access keys, Stripe live keys, bearer tokens, JWT, and RSA/EC private key PEM blocks. Includes false-positive hints for CMS-generated tokens (Drupal, WordPress, build manifests). |

---

## Features

- **Zero backend** — pure static HTML/JS, deployable anywhere
- **5 independent scanners** — a failure in one never blocks the others
- **Severity-ranked findings** — Critical / High / Medium / Low / Info
- **CVE links** — every finding links directly to OSV.dev
- **One-click fix downloads** — links to safe versions on cdnjs and jsDelivr
- **Multi-proxy fallback** — corsproxy.io with automatic failover to allorigins.win
- **Token storage** — access tokens saved in localStorage, auto-suggested per provider
- **Retry scan** — re-run with the same config from the results view
- **Export report** — copy a formatted Teams/Slack-ready report to clipboard
- **Fully responsive** — works on mobile with hamburger nav

---

## Screenshots

> Scan a repository, get a severity-ranked report with CVE links and fix suggestions.

---

## Getting started

### Run locally

```bash
git clone https://github.com/CGMDEV91/js-radar.git
cd js-radar
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for production

```bash
npm run build
# Output is in dist/
```

---

## Deployment

### Cloudflare Workers (recommended)

The repo includes a `wrangler.toml`. Connect the repo in the Cloudflare dashboard and set:

| Field | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

### Cloudflare Pages

| Field | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version (env var) | `22` |

A `public/_redirects` file is included to handle SPA routing.

### Any static host (Vercel, Netlify, GitHub Pages)

Build with `npm run build` and serve the `dist/` folder. Add a catch-all redirect rule pointing all routes to `index.html`.

---

## Getting access tokens

<details>
<summary><strong>GitHub</strong></summary>

1. Go to **github.com** → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → select scope **`repo`** (or `public_repo` for public repos only)
3. The token starts with `ghp_`

</details>

<details>
<summary><strong>GitLab</strong></summary>

1. Go to **gitlab.com** → User settings → Access tokens
2. Add a token → select scope **`read_repository`**

</details>

<details>
<summary><strong>Bitbucket</strong></summary>

1. Go to **bitbucket.org** → Personal settings → App passwords
2. Create app password → enable **Repositories: Read**

</details>

<details>
<summary><strong>Public URL (no token required)</strong></summary>

Enter any public web page URL. JSRadar will fetch the page HTML, extract all `<script src>` tags, and scan each JS file. Use **Advanced options** to paste additional JS file URLs directly, or enable the CORS proxy if direct fetching is blocked.

</details>

---

## Privacy

| What | How |
|---|---|
| Access tokens | Used only to call the provider API (GitHub/GitLab/Bitbucket) directly from your browser. Never sent to any other server. |
| Scanned files | Fetched and analyzed entirely in memory. Nothing is uploaded or stored. |
| CVE lookups | Go directly from your browser to OSV.dev. |
| Token storage | Optionally saved in `localStorage` for convenience. Deletable at any time from the UI. |
| Analytics | None. No cookies, no tracking, no logging. |

> JSRadar is a static HTML file. It has no servers.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 + inline styles |
| HTTP client | Axios |
| CVE databases | retire.js, OSV.dev, NVD |
| Icons | Lucide React |
| Deploy | Cloudflare Workers / Pages |

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large pull request.

```
fork → branch → commit → pull request
```

Areas actively looking for help:
- DOM Clobbering gadget detection (see USENIX Security 2025 research)
- ReDoS pattern analysis via static regex inspection
- GitHub Advisory Database re-check for previously-safe versions
- CSP header auditing (unsafe-inline / unsafe-eval detection)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with care. No servers harmed.</sub>
</div>
