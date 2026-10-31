# Nestly — V1 (MVP)

> Your neighbourhood. Your community. One app.

This is the V1 scaffold built from the product spec: a React Native (Expo)
app covering the core MVP loop — **Login → Location → Join Community →
Home → Feed / Create Post / Report Issue / Services → Profile**.

It runs immediately on **local mock data** (no backend required), and
already includes a ready-to-run **Supabase schema** so you can plug in a
real backend when you're ready — no rewrite needed, just flip the config.

## What's included (V1 — 10 screens)

1. Splash Screen
2. Login / Signup (`AuthScreen`)
3. Location Selection (GPS or manual search)
4. Join Community (nearby community list + request to join)
5. Home (greeting, daily summary, quick actions)
6. Community Feed (categorized posts, like/comment UI)
7. Create Post (category + content)
8. Report Issue (category grid, description, auto-generated `NEST-####` ID, status pipeline)
9. Services (local service provider directory + "My Reported Issues" tab)
10. Profile (user info, community badge, settings menu, log out)

Everything else from the full spec (Marketplace, Events detail, Emergency,
Notices, People directory, AI assistant, business dashboards) is
**intentionally left out of V1** — see "Roadmap" below. This matches the
advice in the original plan: ship the loop first, don't build all 17
screens at once.

## Running it

```bash
cd nestly-app
npm install
npx expo start
```

Then scan the QR code with **Expo Go** (Android/iOS) or press `a` / `i` /
`w` to open an Android emulator, iOS simulator, or the web.

No `.env` file is required to try the app — it runs entirely on the mock
data in `src/data/mockData.js`. Log in with any email/password.

## Connecting the real backend (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `database/schema.sql` — it creates every V1
   table (`users`, `communities`, `posts`, `issues`, `services`, `events`,
   `marketplace`, `notifications`, `announcements`) plus baseline Row
   Level Security policies.
3. Copy `.env.example` to `.env` and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Restart `expo start`. `src/config/supabase.js` automatically detects the
   credentials and creates a real client (`isSupabaseConfigured` becomes
   `true`, shown on the Profile screen's status card).
5. Replace the mock calls in `src/context/AuthContext.js` and
   `src/data/mockData.js` with real Supabase queries — the data shapes
   already match the schema, so each screen just needs its data source
   swapped (e.g. `supabase.from('posts').select('*')` instead of
   `MOCK_POSTS`).

## Project structure

```
nestly-app/
├── App.js                     # Root: providers + navigator
├── app.json                   # Expo app config
├── database/schema.sql        # Full Supabase/Postgres schema + RLS
├── src/
│   ├── components/            # PostCard, IssueCard, ServiceCard, QuickActionButton
│   ├── config/supabase.js     # Supabase client (null until .env is set)
│   ├── context/AuthContext.js # Auth/session/community state
│   ├── data/mockData.js       # Local demo data + mutators
│   ├── navigation/AppNavigator.js  # Splash → Auth → Onboarding → Tabs
│   ├── screens/                # The 10 V1 screens
│   └── theme/colors.js
└── .env.example
```

## Roadmap (matches the original phased plan)

- **Phase 1** — UI/UX + database architecture ✅ (this V1)
- **Phase 2** — Real authentication (email/OTP via Supabase Auth) + live location
- **Phase 3** — Real community creation/joining + admin approval flow
- **Phase 4** — Posts + comments wired to Supabase, image uploads via Supabase Storage
- **Phase 5** — Issue reporting wired to Supabase, status updates, photo/location attachments
- **Phase 6** — Local services: provider onboarding, booking/request flow
- **Phase 7** — Events (join/leave, RSVP counts, event detail screen)
- **Phase 8** — Push notifications (Expo Notifications / FCM)
- **Phase 9** — AI assistant (complaint classification, local search, spam/toxicity detection)
- **Phase 10** — Admin & business dashboards, Marketplace, Emergency/SOS, People directory
- **Phase 11** — Testing
- **Phase 12** — Android APK + Play Store submission (`eas build`)

## Notes

- Icons come from `@expo/vector-icons` (Ionicons) — no extra assets needed.
- `expo-location` is wired into Location Selection for GPS detection; it
  requests permission and falls back gracefully to manual search if denied.
- The issue ID pipeline (`Reported → Assigned → In Progress → Resolved`)
  and colors live in `src/theme/colors.js` (`statusColors`) and
  `database/schema.sql` (`issues.status` check constraint) — keep them in
  sync if you add a new status.
- To build an installable Android APK later: `npx eas build -p android --profile preview` (requires an [Expo EAS](https://docs.expo.dev/build/introduction/) account).
