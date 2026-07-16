# DevSync

> Real-time developer coordination platform — prevent collisions, keep boards in sync with code.

## What It Does

When multiple developers work on one project, things break down: two people fix the same bug, simultaneous edits overwrite each other, task boards drift out of sync with the actual code. DevSync closes that gap with:

- **Assignment Locking** — prevents two devs from grabbing the same task
- **Optimistic Locking** — second save gets a 409 conflict, not a silent overwrite
- **Live WebSocket Broadcast** — every move/edit appears instantly for everyone
- **GitHub Webhooks** — PR merged = task auto-moves to Done

## Architecture

```
┌─────────────┐     REST + WS     ┌──────────────┐     SQL      ┌────────────┐
│  Next.js     │ ◄───────────────► │   FastAPI     │ ◄───────────► │ PostgreSQL │
│  (frontend)  │                   │   (backend)   │               │  (data)    │
└─────────────┘                   └──────┬───────┘               └────────────┘
                                         │
                                  Webhooks + REST
                                         │
                                  ┌──────▼───────┐
                                  │  GitHub API   │
                                  └───────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Drag & Drop | @hello-pangea/dnd |
| Charts | Recharts |
| Backend | FastAPI, Python 3.11+ |
| Database | PostgreSQL + SQLAlchemy 2.0 (async) |
| Auth | JWT + bcrypt |
| Real-time | WebSockets |

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate  # Windows
pip install -e .
uvicorn app.main:app --reload
```

## Project Structure

```
├── frontend/          # Next.js application
│   ├── src/app/       # App Router pages
│   ├── src/components # UI components
│   └── src/features/  # Feature modules (kanban, dashboard)
│
├── backend/           # FastAPI application
│   ├── app/api/       # REST endpoints
│   ├── app/models/    # SQLAlchemy models
│   ├── app/services/  # Business logic
│   └── app/websockets # Real-time layer
```

## License

MIT
