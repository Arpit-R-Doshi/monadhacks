# ECLIPSE.AI Frontend

React + Vite frontend for the ECLIPSE.AI decentralized AI marketplace.

## Stack

- **React 18** with hooks and context
- **Vite** for fast HMR development
- **Framer Motion** for animations
- **React Router** for client-side routing
- **Vanilla CSS** design system (no Tailwind)
- **Fonts**: Bebas Neue (headings) + Manrope (body)
- **Color**: Indigo Blue accent (`#4f46e5`)

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero + features overview |
| `/login` | RoleSelect | Choose User or Model Owner role |
| `/marketplace` | Marketplace | Browse all AI models |
| `/model/:id` | ModelDetail | Chat interface + inference |
| `/dashboard` | Dashboard | Stats, subscriptions, API keys |
| `/history` | ChatHistory | Full prompt + session history |
| `/owner` | OwnerDashboard | Model management + earnings |
| `/owner/upload` | UploadModel | Register a new AI model |

## Design System

The entire design system lives in `src/index.css`:

- **CSS Variables**: `--accent-primary`, `--text-primary`, `--neo-surface`, etc.
- **Type Scale**: `--text-xs` through `--text-3xl` (rem-based)
- **Components**: `.card`, `.btn`, `.form-input`, `.form-select`, `.model-card`, `.stat-card`, etc.
- **Dark theme**: Deep navy/indigo backgrounds (`#0a0a1a`, `#16162a`, `#1c1c38`)

## Development

```bash
npm install
npm run dev       # starts on http://localhost:5173
npm run build     # production build
npm run preview   # preview production build
```

## Environment

The frontend reads `VITE_API_URL` (defaults to `http://localhost:3001`) from `.env.local`:

```env
VITE_API_URL=http://localhost:3001
```
