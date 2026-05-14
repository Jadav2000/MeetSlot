# MeetSlot

MeetSlot is a production-style multi-tenant meeting room booking SaaS built as a pnpm monorepo with an Express/MongoDB API and a Next.js 15 App Router frontend.

## Setup

Local development uses an in-memory MongoDB replica set (no local Mongo install):

```bash
pnpm install
cp server/.env.example server/.env
cp web/.env.example web/.env.local
corepack pnpm --filter server dev:memory
corepack pnpm --filter web dev
```

Run the last two commands in separate terminals. API is `http://localhost:4000`; web is `http://localhost:3000`.

Seeded password for all demo users is `Password123!`.

With your own replica-set MongoDB (for example [MongoDB Atlas](https://www.mongodb.com/atlas)), set `MONGODB_URI` in `server/.env`, then seed once and start both packages from the repo root:

```bash
pnpm install
cp server/.env.example server/.env
cp web/.env.example web/.env.local
corepack pnpm --filter server seed
corepack pnpm dev
```

## Environment

Server:

- `MONGODB_URI`: MongoDB connection string. Use a replica set for transactions.
- `JWT_SECRET`: long random JWT signing secret.
- `CLIENT_ORIGIN`: allowed frontend origin.
- `COOKIE_SECURE`: set `true` behind HTTPS.

Web:

- `NEXT_PUBLIC_API_URL`: API base URL.

## Deployment

Recommended free/low-cost setup:

- MongoDB Atlas free M0 cluster for the database.
- Render, Railway, or Fly.io for the Express API because Vercel serverless functions are not a good fit for this long-running Express app and Mongo transaction workload.
- Vercel for the Next.js frontend.

Backend deployment:

1. Create a MongoDB Atlas cluster and copy the connection string.
2. Create a Render/Railway web service from this repo.
3. Set root/package path to `server` if the platform supports monorepo package selection, or use commands from the repo root:
   - Build: `corepack pnpm install --frozen-lockfile && corepack pnpm --filter server build`
   - Start: `corepack pnpm --filter server start`
4. Set server env vars: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `COOKIE_SECURE=true`, `NODE_ENV=production`.
5. Run the seed once against production only if demo data is desired: `corepack pnpm --filter server seed`.

Frontend deployment on Vercel:

1. Import the GitHub repo in Vercel.
2. Set Root Directory to `web`.
3. Set `NEXT_PUBLIC_API_URL` to the deployed API URL.
4. Build command: `corepack pnpm build`.
5. Output is handled by Next.js automatically.

For cross-site cookies in production, the API must be HTTPS and `CLIENT_ORIGIN` must exactly match the Vercel URL. If the frontend and backend are on different domains, the cookie policy may need `sameSite: "none"` plus `secure: true`; this implementation uses `sameSite: "lax"` for localhost-friendly development.

## Architecture Decisions

- Monorepo packages: `server` and `web`.
- Backend uses modular route/service boundaries under `server/src/modules`.
- Mongoose schemas enforce tenant fields and indexes.
- JWT is stored in an HTTP-only cookie and decoded only by `authMiddleware`.
- Write endpoints use Zod middleware and return a consistent `{ success, message, errors }` failure shape.
- The frontend uses TanStack Query for server state, React Hook Form plus Zod for forms, and small shadcn-style UI primitives.

## Tenancy Model

MeetSlot uses shared collections with `workspaceId` on memberships, rooms, bookings, invites, and audit logs. Workspace routes use `injectWorkspaceContext` to verify membership and attach the trusted workspace role. Room and booking routes derive `workspaceId` from the persisted room or booking, never from a frontend body.

## RBAC

Roles are enforced server-side:

- `OWNER`: manage rooms, members, invites, audit logs, and cancel any booking.
- `MEMBER`: read bookings, create bookings, cancel own bookings.
- `VIEWER`: read-only access.

## Double Booking Prevention

Booking creation validates availability, then writes inside a MongoDB transaction. The `Booking` model also has a unique compound partial index on `{ roomId, startsAt, endsAt }` where `canceledAt` is `null`. Concurrent identical slot requests resolve to one `201` and one `409`.

## Timezone Handling

All booking timestamps are stored as UTC `Date`s. Room availability is defined in the room IANA timezone. `generateSlots`, `convertRoomAvailabilityToUTC`, and `convertUTCToViewerTZ` centralize conversion using `date-fns-tz`. The web slot grid labels the room timezone and also shows the viewer's local time.

## Stretch Goals Implemented

- Buffer time: `Room.bufferMinutes` blocks slots around existing bookings.
- Audit logs: booking creation, booking cancellation, role changes, and invites are logged.
- Rate limiting: booking creation uses an Express token-window limiter.

## Testing

```bash
pnpm test
```

The Vitest/Supertest suite covers cross-tenant reads, cross-tenant writes, viewer booking denial, concurrent booking races, and timezone conversion correctness. Tests use `mongodb-memory-server` with a replica set so transaction behavior is exercised.

## Assumptions

- Fixed slot size is 30 minutes.
- Invites are generated and auditable, but email delivery is out of scope.
- Availability rules are weekly windows like Monday-Friday 09:00-18:00.
- Owners cannot remove themselves through the member removal endpoint.

## What I’d Improve With Another Week

- Add invite acceptance and email delivery.
- Add OpenAPI generation from route schemas.
- Add richer calendar drag selection and cancellation UI.
- Add organization-level billing and workspace deletion lifecycle.
- Add end-to-end Playwright coverage for the booking flow.
