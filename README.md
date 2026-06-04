# VulnScan

Free, anonymous JavaScript vulnerability scanner. Runs entirely in your browser. No account needed. Nothing is stored.

## What it does

VulnScan fetches JavaScript files from a GitHub, GitLab, or Bitbucket repository (or any public web page), then runs five scanners in sequence:

| Scanner | What it checks |
|---|---|
| **retire.js** | Known CVEs in popular JS libraries using the retire.js database |
| **GSAP** | CVE-2020-28478 — prototype pollution in GSAP < 3.6.0 |
| **OSV.dev** | Additional CVEs via the Open Source Vulnerabilities API |
| **SRI Checker** | External scripts loaded without Subresource Integrity (Public URL mode) |
| **Secrets** | Hardcoded API keys, AWS credentials, Stripe keys, and bearer tokens |

Results include severity, CVE links, affected file paths, and one-click download links to safe versions from cdnjs and jsDelivr.

## Privacy

Your access token is used **only** to call the provider API directly from your browser. It is never sent to any other server. This app has no backend — it is a static HTML file.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build for production

```bash
npm run build
# Output is in dist/
```

## Deploy to Cloudflare Pages

1. Push the repository to GitHub
2. In Cloudflare Pages: **Create a project** → connect your repo
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy

No environment variables needed.

## Getting access tokens

### GitHub
1. github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → select scope **repo** (or just `public_repo` for public repos)
3. Copy the token — it starts with `ghp_`

### GitLab
1. gitlab.com → User settings → Access tokens
2. Add a token → select scope **read_repository**
3. Copy the token

### Bitbucket
1. bitbucket.org → Personal settings → App passwords
2. Create app password → enable **Repositories: Read**
3. Copy the app password

### Public URL
No token needed. Enter any public web page URL and VulnScan will fetch and scan all external JavaScript files it loads.
# js-radar
