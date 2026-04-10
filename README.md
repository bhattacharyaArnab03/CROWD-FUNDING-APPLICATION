# Crowdfunding Application

A full-stack crowdfunding platform built with a React frontend and a Node.js microservices backend. The project uses an API gateway for routing, MongoDB for persistence, Redis for caching and distributed locking, and RabbitMQ for async event-driven updates between services.

## Stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Cache and locking: Redis
- Message broker: RabbitMQ
- Session auth: `cookie-session`

## Architecture

The app is split into four backend services plus the frontend:

- `microservices/api-gateway` on `http://localhost:5000`
- `microservices/user-service` on `http://localhost:5001`
- `microservices/campaign-service` on `http://localhost:5002`
- `microservices/payment-service` on `http://localhost:5003`
- Vite frontend on `http://localhost:5173`

Gateway route mapping:

- `/api/auth` -> user service
- `/api/users` -> user service
- `/api/campaigns` -> campaign service
- `/api/donations` -> payment service
- `/api/payments` -> payment service

## Features

- User registration, login, logout, and session restore
- Role-based route protection for `user` and `admin`
- Create, update, browse, and cancel campaigns
- Donation flow with payment record creation
- Per-user donation history
- Campaign progress and funding status updates
- Redis-backed cache for campaign and donation reads
- Redis distributed lock to reduce concurrent donation race issues
- RabbitMQ donation events to update campaign totals and user totals asynchronously
- RabbitMQ fallback to direct HTTP updates when the broker is unavailable

## Project Structure

```text
CROWD-FUNDING-APPLICATION/
|- microservices/
|  |- api-gateway/
|  |- user-service/
|  |- campaign-service/
|  |- payment-service/
|- src/
|  |- Components/
|  |- context/
|  |- pages/
|  |- services/
|- .env
|- package.json
|- start-all.bat
```

## Frontend Routes

- `/` home page
- `/auth` login and register page
- `/explore` campaign listing
- `/dashboard` user dashboard
- `/admin` admin dashboard
- `/payment/:id` payment flow for a campaign

## Services

### API Gateway

The gateway is the single browser-facing backend entry point. It proxies requests to the correct microservice and logs request timing.

### User Service

Responsibilities:

- register and authenticate users
- manage session state
- read user profile data
- track `totalDonated`
- fetch a user's donations from the payment service
- publish `user.registered` events to RabbitMQ

Main endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `GET /api/users`
- `GET /api/users/:id`
- `GET /api/users/:id/donations`
- `POST /api/users`
- `PATCH /api/users/:id/totalDonated`

### Campaign Service

Responsibilities:

- create and update campaigns
- fetch all campaigns or a single campaign
- cancel campaigns
- atomically add raised funds
- fetch campaign donation history from the payment service
- cache campaign lists in Redis
- consume donation events from RabbitMQ

Main endpoints:

- `GET /api/campaigns`
- `GET /api/campaigns/:id`
- `GET /api/campaigns/:id/donations`
- `POST /api/campaigns`
- `PUT /api/campaigns/:id`
- `POST /api/campaigns/:id/cancel`
- `PATCH /api/campaigns/:id/add-funds`

### Payment Service

Responsibilities:

- create donation records
- create payment records
- validate donation amount against campaign target
- use a Redis lock per campaign during donation processing
- publish `donation.created` events to RabbitMQ
- cache donation history queries in Redis
- fall back to synchronous HTTP updates if RabbitMQ is down

Main endpoints:

- `GET /api/donations`
- `GET /api/donations/:id`
- `POST /api/donations`
- `GET /api/payments`
- `GET /api/payments/:id`
- `POST /api/payments`

## Environment Variables

Create a root `.env` file:

```env
MONGO_URI=mongodb://127.0.0.1:27017/crowdfunding
PORT=5000
VITE_API_URL=http://localhost:5000
SESSION_SECRET=your-session-secret
REDIS_URL=redis://127.0.0.1:6379
RABBITMQ_URL=amqp://localhost
USER_SERVICE_URL=http://localhost:5001
CAMPAIGN_SERVICE_URL=http://localhost:5002
```

Notes:

- `PORT` is only relevant to the gateway-facing frontend config in this repo. The service ports are hardcoded in the current implementation.
- `VITE_API_URL` should point to the API gateway.
- All services default to localhost values if these variables are missing.

## Prerequisites

Install locally before starting the app:

- Node.js 18+
- npm
- MongoDB
- Redis
- RabbitMQ

## Installation

```bash
npm install
```

## Running the Project

### Option 1: Run everything with npm

```bash
npm start
```

This starts:

- API gateway
- user service
- campaign service
- payment service
- Vite frontend

### Option 2: Windows batch launcher

```bat
start-all.bat
```

This opens each service in its own terminal and also launches WSL.

## MongoDB Setup

1. Start MongoDB locally.
2. Ensure `MONGO_URI` points to your local instance.
3. Default database name used by this repo is `crowdfunding`.

Example:

```bash
mongod
```

## Redis Setup

Redis is used for:

- caching campaign lists
- caching donation history
- caching user donation lookups
- campaign-level distributed locking in the payment service

Default connection string:

```env
REDIS_URL=redis://127.0.0.1:6379
```

### Start Redis locally

If Redis is installed as a local service, start that service. If you are running it manually:

```bash
redis-server
```

Check connectivity:

```bash
redis-cli ping
```

Expected result:

```text
PONG
```

Behavior when Redis is unavailable:

- read operations fall back to direct MongoDB queries
- payment locking is skipped
- the app still runs, but with weaker performance and concurrency protection

## RabbitMQ Setup

RabbitMQ is used for async communication between services.

Current event flow:

- payment service publishes `donation.created`
- campaign service consumes `donation.created` and updates campaign funds
- user service consumes `donation.created` and updates `totalDonated`
- user service publishes `user.registered`
- campaign service and payment service listen for `user.registered`

Default connection string:

```env
RABBITMQ_URL=amqp://localhost
```

### Start RabbitMQ locally

If RabbitMQ is installed locally as a service, start the service. To verify it is running:

```bash
rabbitmqctl status
```

Optional management UI if enabled:

- URL: `http://localhost:15672`
- default username: `guest`
- default password: `guest`

Queues and exchanges created by the app:

- exchange `donations_exchange`
- exchange `users_exchange`
- queue `donations_queue`
- queue `user_donations_queue`
- queue `campaign_donations_queue`
- queue `payment_user_registered_queue`
- queue `campaign_user_registered_queue`

Behavior when RabbitMQ is unavailable:

- the payment service falls back to synchronous HTTP calls
- the app remains functional
- async decoupling and broker-backed reliability are reduced

## Typical Local Startup Order

1. Start MongoDB
2. Start Redis
3. Start RabbitMQ
4. Run `npm install` if dependencies are not installed
5. Run `npm start`
6. Open `http://localhost:5173`

## Example Local URLs

- Frontend: `http://localhost:5173`
- API gateway: `http://localhost:5000`
- User service: `http://localhost:5001`
- Campaign service: `http://localhost:5002`
- Payment service: `http://localhost:5003`

## Seed / Admin Notes

This repo contains `seedAdmin.js` files under the microservices folders intended for creating an admin user:

- `microservices/user-service/seedAdmin.js`
- `microservices/campaign-service/seedAdmin.js`
- `microservices/payment-service/seedAdmin.js`

The default admin credentials referenced in those scripts are:

- email: `admin@example.com`
- password: `Admin123!`

## Development Notes

- Sessions are cookie-based and configured for local development.
- Passwords are currently stored as plain text in the current implementation.
- Service-to-service URLs are currently localhost-based.
- Redis and RabbitMQ are optional fallbacks in practice, but recommended for the intended architecture.

## Troubleshooting

### Port already in use

The root npm script runs `kill-port` for:

- `5000`
- `5001`
- `5002`
- `5003`
- `5173`

If a service still fails to start, manually stop the conflicting process and retry.

### MongoDB connection failed

- confirm MongoDB is running
- confirm `MONGO_URI` is correct
- confirm the target database is reachable from your machine

### Redis not connected

- confirm Redis is running on port `6379`
- confirm `REDIS_URL` matches your local setup
- the app will continue with direct DB queries if Redis is down

### RabbitMQ not connected

- confirm RabbitMQ is running
- confirm `RABBITMQ_URL` is correct
- the payment service will fall back to direct HTTP updates if the broker is down

## License

No license file is included in the repository at the time of writing.
