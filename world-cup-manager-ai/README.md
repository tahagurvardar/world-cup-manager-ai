# World Cup Manager AI

A clean MVP scaffold for a modern single-player national team football management game. The player selects one country, manages squad and tactics, simulates World Cup fixtures, receives rule-based AI tactical analysis, and progresses through a tournament structure.

This project uses the existing WorldCup idea as inspiration only. The codebase is new, modular, and intended to be easy to extend with real AI providers, richer tournament persistence, mobile clients, or a desktop shell.

## Features

- JWT register/login with protected game routes
- National team selection from the provided official 2026-style 48-team group structure
- Local image-based SVG flag assets for every national team
- Team dashboard with overall, morale, form, next match, tournament progress, and AI advice
- 25-player fictional squads per country with position and attribute data
- Tactics controls for formation, mentality, pressing, tempo, and defensive line
- Deterministic match simulation using team strength, form, morale, stamina, tactical matchups, and seeded variance
- Match output with score, possession, xG, shots, shots on target, fouls, cards, man of the match, and minute-by-minute events
- 2026-style tournament model with 12 groups, best third-place ranking, and a complete 32-team knockout phase
- Full global matchday simulation so every scheduled group fixture is played together
- Knockout matches resolve with extra time and penalties, then advance winners through the bracket
- Rule-based AI tactical advice, match reports, notable matchday news, and qualification headlines
- Dark football-manager-style React UI with responsive cards, tables, charts, and dashboard layout

## Tech Stack

Frontend:

- React
- Vite
- Tailwind CSS
- React Router
- Recharts
- Axios
- Lucide React

Backend:

- Node.js
- Express
- MongoDB with Mongoose
- JWT
- bcryptjs

Deployment targets:

- Frontend: Vercel
- Backend: Render

## Tournament Format

The MVP uses a 2026-style structure:

- 48 national teams
- 12 groups from Group A to Group L
- 4 teams per group
- 3 group matchdays
- Top 2 teams in every group qualify automatically
- Best 8 third-placed teams also qualify
- 32-team knockout stage: Round of 32, Round of 16, Quarter Final, Semi Final, Third Place Match, Final

The Round of 32 bracket is simplified for deterministic gameplay. It uses the 12 group winners, 12 runners-up, and best 8 third-placed teams in a fixed seeded order instead of the official third-place pairing matrix.
Each knockout click simulates the next full round. Drawn knockout matches go to extra time, then penalties if still level.

The team list and groups follow the provided 2026 World Cup structure used by this project, including Turkey in Group D with United States, Paraguay, and Australia. National team names and confederations are real, while all player names and attributes remain fictional/generated for gameplay.

Flags are stored as local SVG image assets under `client/public/flags/` and referenced from team data with paths such as `/flags/turkey.svg`. The app does not use emoji flags or hotlinked external flag images.

## Project Structure

```text
world-cup-manager-ai/
  client/
    public/
      flags/
    src/
      components/
      context/
      data/
      pages/
      services/
  server/
    src/
      config/
      controllers/
      data/
      middleware/
      models/
      routes/
      scripts/
      services/
      utils/
  README.md
  .gitignore
```

## Local Setup

### Backend

```bash
cd server
npm install
copy .env.example .env
```

Edit `server/.env` and set your MongoDB connection string and JWT secret:

```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/world-cup-manager-ai
JWT_SECRET=change_this_secret
CLIENT_URL=http://localhost:5173
```

Seed MongoDB:

```bash
npm run seed
```

The seed command inserts 48 teams and 1,200 fictional players.

Run the backend:

```bash
npm run dev
```

The API runs on `http://localhost:5000`.

### Frontend

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

On macOS or Linux, use `cp .env.example .env` instead of `copy .env.example .env`.

## Troubleshooting

### Missing `MONGO_URI`

If the backend logs `MONGO_URI is not set`, create `server/.env` from `server/.env.example` and add a real MongoDB URI. Authentication, saved game state, and seeding require MongoDB.

### MongoDB Connection Error

If `npm run seed` or `npm run dev` fails with a MongoDB connection error, check that the Atlas username, password, cluster host, and database name are correct. In MongoDB Atlas, also make sure your current IP address is allowed under Network Access.

### CORS Issue

If the browser blocks API requests with a CORS error, confirm the frontend is running at `http://localhost:5173` and that `CLIENT_URL=http://localhost:5173` is set in `server/.env`. Restart the backend after changing `.env`.

### JWT Secret Missing

If the backend warns that `JWT_SECRET` is missing or still using the example value, replace `JWT_SECRET=change_this_secret` with a long random string in `server/.env`, then restart the backend. Existing tokens may become invalid after changing the secret.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/teams`
- `GET /api/teams/:code`
- `POST /api/game/select-team`
- `GET /api/game/dashboard`
- `GET /api/game/squad`
- `GET /api/game/tactics`
- `PUT /api/game/tactics`
- `POST /api/game/simulate` - simulates the next full global group matchday or knockout round
- `GET /api/game/tournament`
- `GET /api/game/news`
- `POST /api/ai/advice`
- `POST /api/ai/match-report`

## AI Layer

The AI layer is intentionally placeholder-first. `server/src/services/aiService.js` exposes rule-based functions:

- `generateTacticalAdvice(team, opponent, tactics)`
- `generateMatchReport(match)`
- `generateNewsHeadline(match)`

These can later be replaced or wrapped by OpenAI, a local LLM, or a provider router without changing controller contracts.

## Roadmap

- Add the official FIFA third-place pairing matrix as an optional advanced bracket mode
- Add training, fatigue recovery, suspensions, and injury events
- Connect AI services to OpenAI or a local LLM
- Add richer charts and tactical comparison screens
- Add save slots and historical tournament archives
- Prepare mobile app and desktop app shells
- Add automated API and simulation tests
