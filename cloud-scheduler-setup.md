# Cloud Scheduler setup — 90-day data purge

The DPDP data-minimisation purge (`/api/cron/purge`) used to run as a Netlify
scheduled function. On Cloud Run we drive it with **Google Cloud Scheduler**.

The route (`app/api/cron/purge/route.ts`) accepts both `GET` and `POST` and
authorizes on an `Authorization: Bearer ${CRON_SECRET}` header (it fails closed
if `CRON_SECRET` is unset).

## Prerequisites

- The app is deployed to Cloud Run and you have its URL, e.g.
  `https://pledges-and-quiz-xxxxxxxx-el.a.run.app`
- `CRON_SECRET` is set as an env var / secret on the Cloud Run service (the same
  value you put in the scheduler header below).

## Create the scheduler job

```bash
gcloud scheduler jobs create http pledges-and-quiz-purge \
  --location=asia-south1 \
  --schedule="0 2 * * *" \
  --time-zone="Asia/Kolkata" \
  --uri="https://[YOUR-CLOUD-RUN-URL]/api/cron/purge" \
  --http-method=POST \
  --headers="Authorization=Bearer [CRON_SECRET]"
```

- **Schedule:** `0 2 * * *` → 02:00 every day.
- Replace `[YOUR-CLOUD-RUN-URL]` and `[CRON_SECRET]` with real values.

## Notes

- If the Cloud Run service requires authentication (not `--allow-unauthenticated`),
  add `--oidc-service-account-email=...` so Scheduler can invoke it; the app's own
  `CRON_SECRET` bearer check still applies on top.
- To update the schedule or target later, use `gcloud scheduler jobs update http
  pledges-and-quiz-purge --location=asia-south1 ...`.
- Test manually: `curl -X POST -H "Authorization: Bearer $CRON_SECRET"
  https://[YOUR-CLOUD-RUN-URL]/api/cron/purge`
