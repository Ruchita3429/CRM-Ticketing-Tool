# Customer Support CRM

Node.js + Express CRM frontend and backend, migrated from SQLite to Supabase PostgreSQL.

## Structure

```text
crm-app/
├── client/   React app
└── server/   Express API
```

## What Goes Where

`client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

`server/.env`:

```env
PORT=5000
JWT_SECRET=your_jwt_secret
NODE_ENV=development
FRONTEND_URL=https://crm-ticketing-tool.vercel.app
SUPABASE_URL=https://mtxcilvvfkfibpprpgem.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The `VITE_SUPABASE_*` values are not used by this app's current architecture. The browser talks to the Express API, and the Express API talks to Supabase.

## Run Order

1. Paste the SQL from [server/db/schema.sql](</C:/CRM ticketing tool/crm-app/server/db/schema.sql>) into the Supabase SQL editor and run it.
2. If the tables already exist, run [server/db/performance.sql](</C:/CRM ticketing tool/crm-app/server/db/performance.sql>) to add the search indexes.
3. Put the backend env vars in `server/.env`.
4. Put the frontend API URL in `client/.env`.
5. Start the backend from `server/`.
6. Start the frontend from `client/`.

## Backend

```bash
cd server
npm install
npm run dev
```

## Frontend

```bash
cd client
npm install
npm run dev
```

## Supabase Tables

Running [server/db/schema.sql](</C:/CRM ticketing tool/crm-app/server/db/schema.sql>) creates:

- `users`
- `tickets`
- `notes`
- `tickets_search_idx`

## Result

- API endpoints keep the same signatures
- The frontend still calls the Express API
- The Express API reads and writes Supabase PostgreSQL
