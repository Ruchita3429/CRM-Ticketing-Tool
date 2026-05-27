# Customer Support CRM

A full-stack Customer Support CRM with ticketing, notes, and JWT authentication.

## Stack

- **Backend:** Node.js, Express, SQLite (better-sqlite3), JWT, bcryptjs
- **Frontend:** React, Tailwind (coming soon)

## Project Structure

```
crm-app/
├── server/          ← Express API
│   ├── db/
│   ├── routes/
│   ├── middleware/
│   └── index.js
├── client/          ← React frontend
└── README.md
```

## Backend Setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The API starts on `http://localhost:5000` by default.

## Demo Users

| Username | Email           | Password  | Role  |
|----------|-----------------|-----------|-------|
| admin    | admin@crm.com   | admin123  | admin |
| agent    | agent@crm.com   | agent123  | agent |

## Auth Endpoints

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "jane",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "agent"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Both endpoints return a JWT token and user object (without password hash).

### Protected Routes

Send the token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## Environment Variables

| Variable    | Description                          |
|-------------|--------------------------------------|
| PORT        | Server port (default: 5000)          |
| JWT_SECRET  | Secret key for signing JWTs          |
| NODE_ENV    | `development` or `production`        |
