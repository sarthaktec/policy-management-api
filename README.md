# Policy Management API

A Node.js REST API for importing policy data from CSV/XLSX files into MongoDB, searching policies by user, aggregating policies by user, monitoring CPU utilization, and scheduling messages.

The entire application is containerized using Docker Compose.

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- Worker Threads
- Docker
- Docker Compose
- Multer
- csv-parser
- xlsx

## Getting Started

### Prerequisites

- Docker
- Docker Compose

No local Node.js or MongoDB installation is required when using Docker Compose.

### Clone and Run

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd policy-management-api
docker compose up --build
```

The API runs at `http://localhost:3000`.

Health check:

```bash
curl http://localhost:3000/health
```

## Architecture

```text
Client
  |
  v
Express API :3000
  |
  +--> Upload API --> Worker Thread --> CSV/XLSX Parser --> Import Service --> MongoDB
  |
  +--> Policy Search / Aggregation -------------------------------> MongoDB
  |
  +--> Message Scheduling --> Scheduler --> MongoDB
  |
  +--> CPU Monitor --> process.exit(1) at >=70% --> Docker restart
```

## Task 1 — Policy Management

### Upload CSV/XLSX

**Endpoint**

```http
POST /api/upload
```

Use `multipart/form-data` with field name `file`.

Supported formats:

- `.csv`
- `.xlsx`

Example:

```bash
curl -X POST http://localhost:3000/api/upload   -F "file=@data-sheet.csv"
```

The upload is parsed in a Worker Thread so file parsing does not block the main Node.js event loop.

Example response:

```json
{
  "success": true,
  "message": "File processed successfully",
  "totalRows": 1198,
  "imported": {
    "agents": 3,
    "users": 1149,
    "accounts": 1193,
    "lobs": 19,
    "carriers": 46,
    "policies": 1198
  }
}
```

Temporary uploaded files are deleted after processing.

### MongoDB Collections

Separate collections are used for:

- `agents`
- `users`
- `useraccounts`
- `lobs`
- `carriers`
- `policies`
- `scheduledmessages`

Policies reference the corresponding User, LOB, and Carrier documents.

### Search Policies by Username

**Endpoint**

```http
GET /api/policies/search?username=<value>
```

The API searches users by first name or email and returns their policies.

Example:

```bash
curl "http://localhost:3000/api/policies/search?username=Lura"
```

### Aggregate Policies by User

**Endpoint**

```http
GET /api/policies/aggregate
```

Example:

```bash
curl http://localhost:3000/api/policies/aggregate
```

The response contains each user and their total policy count.

## Task 2 — CPU Monitoring

The application takes CPU snapshots every 5 seconds and calculates utilization between consecutive snapshots.

If CPU utilization reaches or exceeds **70%**, the Node.js process exits.

Docker Compose uses:

```yaml
restart: unless-stopped
```

This allows Docker to restart the application container after the process exits.

## Scheduled Messages

### Schedule a Message

**Endpoint**

```http
POST /api/messages/schedule
```

Request body:

```json
{
  "message": "Scheduler test",
  "date": "2026-09-20",
  "time": "14:55"
}
```

The API interprets the supplied date/time as IST (`UTC+05:30`).

Example:

```bash
curl -X POST http://localhost:3000/api/messages/schedule   -H "Content-Type: application/json"   --data-binary "@test-message.json"
```

A scheduler checks pending messages every second. When the scheduled time is reached, the message is marked as completed and `processedAt` is recorded.

## Environment Variables

`.env.example`:

```env
PORT=3000
MONGO_URI=mongodb://mongodb:27017/policy-management
```

Docker Compose supplies these values to the application container.

## Project Structure

```text
policy-management-api/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── message.controller.js
│   │   └── policy.controller.js
│   ├── models/
│   │   ├── Agents.js
│   │   ├── Users.js
│   │   ├── UserAccount.js
│   │   ├── LOB.js
│   │   ├── Carrier.js
│   │   ├── Policy.js
│   │   └── ScheduledMessage.js
│   ├── routes/
│   │   ├── upload.routes.js
│   │   ├── policy.routes.js
│   │   └── message.routes.js
│   ├── services/
│   │   ├── import.service.js
│   │   ├── cpuMonitor.service.js
│   │   └── messageScheduler.service.js
│   ├── workers/
│   │   └── upload.worker.js
│   ├── app.js
│   └── server.js
├── uploads/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

## API Summary

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/upload` | Upload CSV/XLSX policy data |
| GET | `/api/policies/search?username=` | Search policies |
| GET | `/api/policies/aggregate` | Aggregate policies by user |
| POST | `/api/messages/schedule` | Schedule a message |

## Docker Services

Docker Compose starts:

- `app` — Node.js API on port 3000
- `mongodb` — MongoDB on port 27017

MongoDB data is persisted using a Docker named volume.

Stop the application:

```bash
docker compose down
```

Stop and remove the MongoDB volume:

```bash
docker compose down -v
```

> `docker compose down -v` deletes persisted MongoDB data.

## Testing

The APIs can be tested with cURL, Thunder Client, or Postman.

Health:

```bash
curl http://localhost:3000/health
```

Policy search:

```bash
curl "http://localhost:3000/api/policies/search?username=Lura"
```

Policy aggregation:

```bash
curl http://localhost:3000/api/policies/aggregate
```

## Author

Sarthak Priyadarshan
