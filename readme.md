# Rapido — Distributed Real-Time Ride-Hailing Dispatch System

A backend system that models the core engineering problems behind ride-hailing platforms: real-time geospatial matching, event-driven coordination across services, and consistent state management under concurrent load.

This repo implements **Phase 1 (Core Slice)** of a larger target architecture. The full system design is documented below — completed pieces are marked `✅ Built`, and everything else is marked `🔭 Planned` to show deliberate scoping rather than an abandoned sprawl.

---

## Why this project exists

Most CRUD portfolio projects don't force you into real distributed-systems problems. This one does, on purpose:

- **Scalability** — driver location updates arrive continuously, at volume, and the matching path has to stay fast as fleet size grows.
- **Reliability** — no single service failure should be able to take down the whole pipeline.
- **State management** — a ride moves through a strict lifecycle (`Requested → Matched → Accepted → In Progress → Completed/Cancelled`), and that state has to stay consistent even with concurrent requests.
- **Geospatial computation** — "find the nearest available driver" is the actual algorithmic core of the system, not a bolted-on feature.

---

## Architecture Overview

![Architecture Diagram](./docs/architecture.png)

The system is built as a set of independently deployable microservices connected by an event bus, backed by purpose-specific data stores chosen for what each is actually good at — not a single database doing everything.

---

## End-to-End Flow

| Step | Component | What happens | Status |
|---|---|---|---|
| 1 | **API Gateway** | Entry point for all rider/client traffic — rate limiting, JWT validation, routing, load balancing | ✅ Built |
| 2 | **Auth Service** | Issues OAuth2/JWT tokens; gateway validates them on every request | ✅ Built |
| 3 | **Location Stream + Real-Time Location Pipeline** | Driver app streams GPS pings (lat/lng/heading/speed) every 1–5s via WebSocket/MQTT → ingestion → validation/enrichment → written into Redis | ✅ Built |
| 4 | **Ride Request Service** | Rider creates a ride request; service validates rider and determines pickup location | ✅ Built |
| 5 | **Dispatch / Matching Service** | Geo-searches Redis for nearby available drivers, scores/ranks them, and transactionally assigns a ride | ✅ Built |
| 6 | **Apache Kafka (Event Bus)** | Publishes `ride.requested`, `ride.matched`, `ride.accepted`, `ride.started`, `ride.completed`, `driver.location`, etc. — decouples every downstream service | ✅ Built |
| 7 | **Ride Management Service** | Owns the ride state machine; single source of truth for ride status | ✅ Built |
| 8 | **Driver Service** | Tracks driver profile, vehicle info, online/offline/busy status | 🔭 Planned |
| 9 | **Payment Service** | Fare calculation, payment processing, refunds, invoices | 🔭 Planned |
| 10 | **Notification Service** | Push/SMS/in-app updates back to rider and driver apps in real time | 🔭 Planned |
| 11 | **Analytics Pipeline** | Kafka Connect/CDC → data lake → BI dashboards, read-only side door off the same topics | 🔭 Planned |
| 12 | **Cross-Cutting Services** | Service discovery, config server, circuit breakers, observability, centralized logging | 🔭 Planned (partial: see Observability) |

---

## Tech Stack & Why Each Piece Was Chosen

### ✅ Built (Phase 1)

| Component | Tech | Why this, specifically |
|---|---|---|
| Geospatial + live state | **Redis** (`GEOADD`/`GEORADIUS`, TTL keys) | Driver locations need millisecond-level "who's nearby" queries at high write frequency. TTL means a driver who goes silent simply expires from the available pool — no cleanup job needed. |
| Event backbone | **Apache Kafka** | Decouples services so a slow/failed consumer (e.g. notifications) never blocks ride creation or driver assignment. Topics are partitioned and durable, so events aren't lost if a consumer is temporarily down. |
| Transactional system of record | **PostgreSQL + PostGIS** | Ride-to-driver assignment must be atomic — two requests must never claim the same driver. Redis tells you who's *nearby*; Postgres guarantees the assignment is *exclusive and durable*. PostGIS adds geospatial queries with full ACID guarantees as a durable counterpart to Redis's speed. |
| Containerization | **Docker** | Identical runtime for every service, locally and in the cluster. |
| Orchestration | **Kubernetes** | Each service scales independently — Dispatch/Matching sees spiky load and can scale to many replicas while steadier services stay small. This is the actual payoff of splitting into microservices in the first place. |

### 🔭 Planned (Phase 2+)

| Component | Tech | Why it's deferred, not abandoned |
|---|---|---|
| Historical/event data | **MongoDB** | Given a concrete job it alone is good at (high-throughput, schema-flexible raw location history) rather than added just to check a box. |
| Blob storage | **S3 / MinIO** | Receipts, driver documents, media — large unstructured objects don't belong in a relational or document store. |
| Observability | **Prometheus + Grafana + Jaeger** | High-value next step — lets scalability claims be backed by real latency/throughput numbers instead of assertions. |
| Service discovery / config server | **Eureka/Consul, Spring Cloud Config** | Kubernetes' built-in DNS-based discovery already covers most of this for a project at this scale; would only add real value at larger team/service-count scale. |
| Circuit breakers | **Resilience4j** | Prevents cascading failures once there are enough inter-service synchronous calls to make it worth the overhead. |
| Analytics pipeline | **Kafka Connect/CDC → Data Lake → BI dashboards** | Read-only side door off existing Kafka topics — doesn't touch the live path, so it's purely additive whenever it's built. |
| External integrations | Maps/Routing, Payment Gateway, SMS/Email, Push | Real third-party integrations swapped in once Payment/Notification services are built. |

---

## Core Design Decisions (Interview Talking Points)

**Why two geo-capable stores (Redis *and* PostGIS)?**
Redis is the hot path — fast, ephemeral, optimized for "who's near this point right now." PostGIS is the system of record — slower, but transactional, so ride assignment can never double-book a driver. Using only one of the two would force a tradeoff the system shouldn't have to make: either lose speed or lose correctness.

**Why Kafka instead of direct service-to-service calls?**
Direct calls create cascading failure — if the Notification Service is down, a synchronous design would block ride creation entirely. With Kafka, the ride is still created and the driver still assigned; the notification simply catches up once the consumer recovers. This is the project's core reliability story.

**Why is the ride state machine centralized in one service?**
If every service could mutate ride status, the system could reach impossible states (e.g., "completed" and "in progress" simultaneously) under concurrent updates. Centralizing ownership in Ride Management makes the state machine the single source of truth.

**Why doesn't Ride Request do its own matching?**
Keeping intake/validation separate from the matching algorithm means each can scale and evolve independently — matching logic is the most likely part of the system to get more complex over time (driver scoring, surge logic, etc.), and isolating it keeps that complexity from leaking into request handling.

---

## Project Structure

```
rapido/
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── ride-request-service/
│   ├── dispatch-matching-service/
│   ├── ride-management-service/
│   ├── location-ingestion-pipeline/
│   ├── driver-service/          # planned
│   ├── payment-service/         # planned
│   └── notification-service/    # planned
├── infra/
│   ├── docker-compose.yml
│   └── k8s/
│       ├── deployments/
│       ├── services/
│       └── configmaps/
├── docs/
│   └── architecture.png
└── README.md
```

---

## Running Locally

```bash
# Clone and enter the repo
git clone <repo-url>
cd rapido

# Start the full stack (Kafka, Redis, Postgres, and all built services)
docker-compose up --build
```

Once running:
- API Gateway: `http://localhost:8080`
- Kafka topics auto-created on first run (see `infra/docker-compose.yml`)
- Redis and Postgres ports exposed for local inspection

```bash
# Deploy to a local Kubernetes cluster (minikube/kind)
kubectl apply -f infra/k8s/
```

---

## Load Testing / Proof of Scalability

> Replace with real numbers once benchmarks are run.

- Simulated **N concurrent drivers** streaming location updates every 1–5s
- Measured matching latency (request → assigned driver) under load
- Measured Kafka consumer lag under burst traffic

---

## Roadmap

- [x] API Gateway + Auth
- [x] Real-time location ingestion → Redis geo-index
- [x] Ride Request, Dispatch/Matching, Ride Management services
- [x] Kafka event bus wiring across core services
- [x] Dockerized + deployed to Kubernetes
- [ ] Driver Service
- [ ] Payment Service (mocked gateway)
- [ ] Notification Service
- [ ] MongoDB for location history
- [ ] Observability stack (Prometheus/Grafana)
- [ ] Analytics pipeline
- [ ] Circuit breakers + service mesh resilience patterns

---

## License

MIT