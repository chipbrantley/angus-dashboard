# Angus's Dashboard

A one-page daily dashboard for keeping track of school and life, cloned from
[cb-dash.netlify.app](https://cb-dash.netlify.app) and adapted for college.

- **`index.html`** — the whole app. All the customizable content (courses,
  habits, weekly resets, daily schedule, life-admin cards) lives in the
  clearly-marked **CONFIG** section at the top of the `<script>`.
- **`netlify/functions/`** — five small serverless functions: the Google
  integration (Calendar events, `#dashboard` deadlines, Google Tasks, an
  optional Google Doc log) plus `state.mjs`, which keeps the card slate
  (Courses + Life Admin) in Netlify Blobs so edits sync across devices.
  Reads are public; writes require a browser that has connected Google.
- **`netlify.toml`** — routes `/api/*` and `/auth/callback` to those functions.

The page works fine with **zero setup** — habits, courses, notes, and weekly
resets all save to the browser's localStorage. The Google integration is the
only part that needs deployment + configuration.

## How the system works (for Angus)

1. **Every syllabus date goes on Google Calendar** the day you get it. Add
   `#dashboard` to the event description and it pins itself to the top of the
   page, turning red as it gets close.
2. **To-dos go in Google Tasks** (built into Gmail/Calendar sidebar). They show
   up here; tap the circle to complete them.
3. **Habits are daily**, including a "studied?" chip per course. Weekly Resets
   (laundry, call home, budget check) are your Sunday pass.
4. **Sunday Reset**: 20 minutes to look at the week, per the countdown card.
5. Click **Edit** on any course or life-admin card to update its status and
   next action. Everything is renameable.

## Deploying (15 minutes, one time)

1. **Netlify**: create a new site and point it at this folder
   (`netlify deploy --prod` with the CLI, or drag the folder into the Netlify
   UI — but use the CLI/git so the functions deploy too). Note the URL, e.g.
   `https://angus-dash.netlify.app`.
2. **Google Cloud OAuth client**: in [console.cloud.google.com](https://console.cloud.google.com)
   you can reuse the existing cb-dash OAuth client — just add
   `https://<angus-site>.netlify.app/auth/callback` as an additional authorized
   redirect URI. (Or make a fresh client the same way.) Angus authorizes with
   *his own* Google account, so his calendar/tasks stay his.
   - Enable APIs if using a new project: Calendar API, Tasks API, Docs API.
   - If the OAuth consent screen is in "Testing" mode, add Angus's Google
     account as a test user.
3. **Netlify environment variables** (Site settings → Environment):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_DOC_ID` *(optional — a Google Doc that collects daily intentions
     and habit logs. Create an empty Doc in Angus's account, grab the long id
     from its URL. Skip it and notes simply save locally.)*
4. **`index.html`**: paste the client id into `const CLIENT_ID=''` in the
   CONFIG section and redeploy.
5. Open the site, hit **Connect Google Calendar**, sign in as Angus, done.

## Customizing

Open `index.html` and edit the CONFIG section:

- `COURSES` — real course names once registration happens (`short` is the
  habit-chip label).
- `BASE_HABITS`, `LIFE_PRACTICES` — habits and weekly resets.
- `SCHED` + `SCHED_RANGES` — the daily time template (keep the two in sync;
  ranges are minutes-from-midnight and drive the "now" highlight).
- `QUEUE` — the slow-burn life-admin cards.
- Colors are CSS variables at the top of the file — `--accent` is currently a
  collegiate navy; swap in school colors once he commits.
