# Lead Booking Agent

An AI chat assistant for local businesses (dentists, salons, roofers, gyms…) that:

1. Answers visitor questions using **only** the business info you configure
2. Captures the visitor as a lead (name, email, phone, what they need) into Supabase
3. Checks **real** open times on the owner's Google Calendar (business hours minus busy events)
4. Books the appointment on that calendar and Google emails the visitor an invite
5. Shows every lead and booking at `/admin`

The business owner just pastes one `<script>` tag on their site.

All services run on free tiers: Gemini API, Supabase, Google Calendar API, Vercel Hobby.

> **Selling it:** run one deployment per client, each with its own env vars. The usual model is a setup fee plus a monthly fee.
> Vercel's Hobby plan is for **non-commercial** use, so move to a client-paid or Pro plan once you're charging.
> Data sent to the Gemini **free** tier may be used by Google to improve its products, so tell clients this or switch to a paid key for sensitive businesses.

## Setup (about 20 minutes)

### 1. Gemini key
Create a free key at <https://aistudio.google.com/apikey> and set it as `GEMINI_API_KEY`. The default model `gemini-flash-lite-latest` has the highest free-tier limits. Each visitor message uses 1–3 requests.

### 2. Supabase
1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. From **Project Settings → API**, copy the project URL into `SUPABASE_URL` and the `service_role` key into `SUPABASE_SERVICE_ROLE_KEY`. That key is server-only, so never expose it to the browser.

### 3. Google Calendar (the business owner's calendar)
1. At <https://console.cloud.google.com>, create a project and enable the **Google Calendar API**.
2. Under **OAuth consent screen**, choose External, add yourself as a test user, then click **Publish app**. While the app stays in "Testing", refresh tokens expire after 7 days.
3. Under **Credentials → Create credentials → OAuth client ID**, choose type **Desktop app**. Copy the ID and secret.
4. On your computer, run:
   ```bash
   npm install
   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run google-token
   ```
   Sign in as the calendar owner (click through the "unverified app" warning), then copy the printed `GOOGLE_REFRESH_TOKEN`.

### 4. Business settings
Copy `.env.example` to `.env.local` and fill in `BUSINESS_*`. The agent only states facts that appear in `BUSINESS_INFO`, so put prices, services, address, insurance and policies there.

### 5. Run and deploy
```bash
npm run dev            # http://localhost:3000. The chat bubble is live there.
```
To deploy, import the repo in Vercel, add all the env vars, and deploy.

### 6. Install on the client's site
```html
<script src="https://YOUR-DEPLOYMENT.vercel.app/embed.js" async></script>
```
Leads appear at `/admin` (user `admin`, password `ADMIN_PASSWORD`).

## How it works

- `src/lib/agent.ts` runs the Gemini function-calling loop with three tools: `check_availability`, `save_lead` and `book_appointment`.
- `src/lib/calendar.ts` turns `BUSINESS_HOURS` into slots and removes anything Google Calendar's freeBusy reports as busy. Before booking it re-checks live availability, so the model can't book a time it made up or one that was taken in the meantime.
- `src/lib/db.ts` stores the conversation history server-side and upserts one lead per conversation in Supabase.
- `src/app/widget` is the chat UI, iframed by `public/embed.js`.
