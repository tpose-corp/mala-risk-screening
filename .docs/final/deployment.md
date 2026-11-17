# Deployment notes

**Live:** https://mala-risk-screening.vercel.app (synthetic data only, demo accounts in
[`../../app/README.md`](../../app/README.md#run-it-on-your-machine))

## History

| Date | Where | Note |
|---|---|---|
| 7 Oct 2026 | Railway (SQLite) | Alpha MVP demo. Stopped when the free trial credit ran out (issue T-04). |
| 17 Nov 2026 | Vercel (app) + Neon (PostgreSQL, Singapore) | v2 after the hospital UAT. Both free tiers. |

## How it is set up

| Part | Setting |
|---|---|
| Vercel project | `tpose-corp/mala-risk-screening`, Root Directory `app`, framework Next.js |
| Build | `npm run vercel-build` = `prisma generate && prisma migrate deploy && next build`, so new migrations reach the database on every deploy |
| Region | `app/vercel.json` pins the server code to `sin1` (Singapore), next to Neon. Before this the code ran in `iad1` (USA) and log in took 9.1 s (`test/results/live-speed-2026-11-18.md`) |
| Secrets | `DATABASE_URL` (Neon pooled) and `DIRECT_URL` (Neon direct, used only by migrations) are Vercel environment variables of type Secret, Production only. They are never in git. |
| Upload filter | `.vercelignore` (repo root and `app/`) keeps `.env*`, local databases, `node_modules` and `thresholds/` out of the upload |
| Data | `npx prisma db seed` (demo accounts and units) and `npm run db:seed:history` (5 years of synthetic history: 8 units, 457 patients, 3,440 screenings, 766 alerts) |

## Known limits of the demo

- The demo password `mala1234` is public in this repo, so anyone can log in as the demo admin.
  The data is synthetic, but someone could change it. For the real hospital deployment, run the
  seed without demo accounts and create accounts from `/admin/users`.
- Neon's free tier pauses the database after about 5 minutes without use. The first request after
  a pause is slower. Open the site a minute before a demo.
- Automatic deploy on push is not connected yet: the Vercel GitHub app needs permission from an
  owner of the `tpose-corp` GitHub organization. Until then a member deploys with
  `npx vercel --prod` from the repo root.

## Moving to the hospital's own server

The app needs only Node.js 20 and any PostgreSQL. Set `DATABASE_URL`, run
`npx prisma migrate deploy`, then `npm run build && npm start`. The server clock must be synced
(NTP) because audit log times come from it (Computer Crime Act section 26, see `rule.md`).
