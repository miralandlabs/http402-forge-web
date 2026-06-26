# http402-forge-web

Http402 Trade Production UI for [http402.trade](https://http402.trade) — emerald theme, EN/中文, wallet checkout.

```bash
npm install
npm run dev
```

Production builds set `VITE_*` in GitHub Actions (see `.github/workflows/deploy.yml`).

Optional GitHub secrets for Helius or other RPC providers (recommended over public Solana RPC):

- `VITE_RPC_URL_PRODUCTION` — mainnet, e.g. `https://mainnet.helius-rpc.com/?api-key=…`
- `VITE_RPC_URL_PREVIEW` — devnet, e.g. `https://devnet.helius-rpc.com/?api-key=…`

Local dev uses the Vite proxy; override RPC with `VITE_RPC_URL` in a `.env.local` if needed.
