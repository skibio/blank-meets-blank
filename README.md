# Blank Meets Blank

A movie idea generator built on the classic Hollywood pitch format:

> _"Jaws meets 2001: A Space Odyssey."_

Type two movie titles into the blanks — or leave them empty and let the app pick
well-known films at random — then hit **Pitch It** to generate a brand-new
fictional movie title and synopsis.

## Stack

- **Next.js** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- No backend, database, auth, or external AI — Version 1 generates everything
  locally.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  layout.tsx      Root layout + fonts + metadata
  page.tsx        The poster UI (the only place the UI lives)
  globals.css     Tailwind import + theme + animations
lib/
  movies.ts       The built-in catalog of well-known films + metadata
  generator.ts    Pitch generation logic (decoupled from the UI)
```

## Swapping in an AI model later

The UI depends on exactly one function: `generatePitch(input)` in
`lib/generator.ts`. It's already `async` and returns a stable `PitchResult`
shape. To go live with a model, implement the call (see the
`generatePitchWithAI` sketch at the bottom of that file) and have `generatePitch`
delegate to it. No component changes required.

## Deploy

Deploys to [Vercel](https://vercel.com) with zero configuration — import the
repo and ship. `npm run build` produces a clean production build.
