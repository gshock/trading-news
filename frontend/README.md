# Trading Daily — Frontend

React subscription portal for managing email subscriptions to pre-market briefings and sector snapshots.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable       | Description                        | File                             |
| -------------- | ---------------------------------- | -------------------------------- |
| `VITE_API_URL` | Backend API base URL               | `.env.local` / `.env.production` |
| `VITE_API_KEY` | API key for authenticated requests | `.env.local` / `.env.production` |

> `vite dev` reads `.env.local`; `vite build` reads `.env.production`. Neither file is committed.

### Development

```bash
npm run dev
```

The app will be running at `http://localhost:5173`.

### Build

```bash
npm run build
```

### Tech Stack

- React 19, TypeScript, Vite 7
- Tailwind CSS 4
- TanStack React Query
- Axios
- React Toastify
