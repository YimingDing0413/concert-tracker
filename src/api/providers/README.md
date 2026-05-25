# External API providers (future)

Implement each provider as a module that maps external responses to types in `@/types`, then compose them in `src/api/index.ts`.

Suggested layout:

```
providers/
  ticketmaster/
    client.ts
    mappers.ts
  setlistfm/
    client.ts
    mappers.ts
  bandsintown/
    client.ts
    mappers.ts
```

Environment variables (`.env` — not committed):

```
VITE_TICKETMASTER_API_KEY=
VITE_SETLISTFM_API_KEY=
```
