# I Wanna Be A Volunteer

A multi-council volunteer registration platform for school councils at Burnaby North Secondary School.

## Features

- **Multi-Council Support** - Multiple councils can use the same platform
- **Council-Specific Events** - Each council manages their own volunteer opportunities
- **Participant Council Selection** - Students pick their council and see relevant events
- **Supabase Auth** - Secure email/password authentication for council admins
- **Superuser Management** - Create councils and manage admin accounts
- **Real-time Countdown** - Events have countdown timers and progress bars
- **Duplicate Detection** - Prevents duplicate volunteer submissions
- **Modern Minimalist UI** - Clean design with smooth interactions

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) — hell yeah better than react yall
- [Supabase](https://supabase.com/) — when ur too lazy to setup postgres on aws rds or neon
- [Tailwind CSS](https://tailwindcss.com/) — we know its better than vanila css
- [TypeScript](https://www.typescriptlang.org/) — no explanation needed.

## Getting Started

```sh
npm install
npm run dev
```

## Environment

Add `.env` with Supabase credentials:

```
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Find these in: Supabase Dashboard → Settings → API

⚠️ **Keep your service role key secret!** Never commit it to git.

## Setup

See `SETUP_GUIDE.md` for detailed instructions on:

- Running database migrations
- Setting up Supabase Auth
- Creating your superuser account
- Managing councils and admins

## Build

```sh
npm run build
```
