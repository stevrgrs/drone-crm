# Cardinal Drones AI CRM Project Context

This document captures the working context pulled from prior ChatGPT conversations so future CRM edits can be made without re-discovering the project details.

## Project identity

- Project name: **Cardinal Drones AI CRM Project**
- Company: **Cardinal Drones LLC**
- GitHub repo: `stevrgrs/drone-crm`
- Production/deployment stack: **GitHub + Vercel + Supabase**
- App stack: **Next.js 14, React 18, TypeScript, Tailwind, Supabase**
- Main goal: a practical repair-shop CRM for drone intake, customer management, repair status, photos, invoices, pickup/dropoff tracking, and AI-assisted search/entry.

## Known database/storage structure

Known Supabase tables and storage:

- `customers`
- `service_jobs`
- `job_images`
- Storage bucket: `customer-images`

Known or implied customer fields:

- `id`
- `full_name`
- `phone`
- `email`
- `notes`

Known or implied service job fields:

- `id`
- `customer_id`
- `title`
- `description`
- `diagnosis`
- `treatment`
- `status`
- `date_in`
- `created_at`

Important distinction:

- `created_at` means when the database record was created.
- `date_in` means when the drone/customer item actually came in, was dropped off, was received, or entered intake.

For user queries like “came in,” “dropped off,” “brought in,” “received,” or “intake,” prefer `service_jobs.date_in` rather than `service_jobs.created_at`.

## Existing CRM features remembered from prior work

The app has or was planned to have these flows:

- Search customers/jobs
- Add/edit customers
- Repair/job editing
- Stage-based repair photos
- Invoice flow
- SMS/contact support
- Excel backup/export
- Completed jobs list
- Pickup/dropoff appointment list

Known home page routes/buttons from current repo:

- `/customers/new` — add customer
- `/invoices` — invoices
- `/completed` — completed list
- `/appointments` — pickups/dropoffs
- `/api/export-backup` — export backup

## Existing structured CRM search

Existing important files:

- `lib/crm/search.ts`
- `app/api/ai-search/route.ts`
- `app/page.tsx`
- `app/SearchResultsClient.tsx`

Current structured search behavior:

- `searchCrm(rawQuery, { timeZone })` parses plain-language CRM search text into structured filters.
- Default timezone should be `America/New_York`.
- The API route `/api/ai-search` calls `searchCrm` and returns cards/debug JSON.
- The home page uses `searchCrm` server-side when `?q=` is supplied.
- `?debug=1` shows the structured search debug output.

Known date phrase support:

- `today`
- `yesterday`
- `this week`
- `last week`

Known job-intake phrase support:

- `came in`
- `come in`
- `date in`
- `dropped off`
- `drop off`
- `brought in`
- `received`
- `intake`

Known status support:

- `urgent`
- `completed`
- `picked up`
- `in progress`
- `pending`

Useful test searches:

- `which customers still have drones to be done`
- `which need calls`
- `all entries last week`
- `drones that came in today`
- `drones dropped off yesterday`
- `urgent jobs this week`
- `completed jobs last week`

## AI / OpenAI API direction

The desired AI behavior is not just keyword search. The CRM should eventually support a single natural-language/voice box for messy employee input.

Target workflow:

1. Employee speaks or types messy CRM info.
2. OpenAI parses it into structured JSON.
3. App shows a preview/confirmation screen.
4. User confirms or edits.
5. Backend writes validated data to Supabase.

Important design rule:

- The AI should propose structured changes, but the CRM backend should validate before writing to Supabase.
- Do not let freeform AI text directly write arbitrary database changes.

Agent Builder note:

- Agent Builder can be useful for prototyping behavior, but production CRM logic should live inside the Next.js app/API routes.

## Intended AI intake fields

The AI intake feature should try to parse messy voice/text into something like:

```json
{
  "intent": "create_or_update_customer_job",
  "customer": {
    "full_name": null,
    "phone": null,
    "email": null,
    "notes": null
  },
  "job": {
    "title": null,
    "description": null,
    "diagnosis": null,
    "treatment": null,
    "status": null,
    "date_in": null
  },
  "photos": [],
  "follow_up": {
    "needs_call": false,
    "call_reason": null,
    "pickup_or_dropoff": null,
    "appointment_date": null
  },
  "confidence": 0,
  "missing_fields": []
}
```

Suggested safe implementation path:

1. Add an API route such as `app/api/ai-intake/route.ts`.
2. Route accepts `{ text, timeZone }`.
3. Route calls OpenAI Structured Outputs or JSON schema mode.
4. Route returns parsed JSON only.
5. Client displays a confirmation preview.
6. Separate save route writes the confirmed data to Supabase.

## Important OpenAI/Vercel environment note

Expected environment variable:

- `OPENAI_API_KEY`

Do not commit secrets to GitHub.

Supabase environment variables are expected to already exist in Vercel/local environment; do not hard-code them.

## Editing preferences / project constraints

- Keep the CRM practical and low-cost.
- Prefer direct Next.js/Supabase code over extra platforms unless needed.
- Preserve simple shop workflow: customer, drone/job, issue, photos, status, notes, invoices, pickup/dropoff.
- Keep debugging visible when `debug=1` is present.
- Avoid overbuilding. Ship small, working pieces.

## Current best next edits

Recommended next code edits:

1. Add an AI intake API route using OpenAI structured JSON parsing.
2. Add a simple “AI Intake / Voice Entry” page or panel.
3. Show parsed preview before save.
4. Add a confirmed-save endpoint that upserts customer/job data into Supabase.
5. Extend search parser with phrases like:
   - `needs call`
   - `call back`
   - `not done`
   - `to be done`
   - `waiting on parts`
   - `ready for pickup`
6. Make sure “came in / dropped off / received / intake” keeps using `date_in`.

## Known commit history from prior work

Prior remembered commits include:

- `0bc33f22`
- `a0c51de`
- `7ff286a`
- `6b974416`
- `6bcd8c95`

These related to structured CRM search and the date field behavior.
