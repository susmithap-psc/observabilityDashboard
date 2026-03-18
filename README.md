PRODUCT REQUIREMENTS DOCUMENT
PulseBoard
Unified Observability Dashboard for Small Startups


Version
	1.0 – MVP
	Status
	Draft
	Stack
	MERN + AI + n8n + Superset
	Deployment
	Render
	Storage
	MongoDB Atlas + PostgreSQL
	



1. Product Vision
Small startups rely on multiple fragmented tools: GitHub for deployments, Sentry for error tracking, UptimeRobot for uptime monitoring, and Slack for alerts. These tools generate valuable signals, but those signals are scattered across different dashboards.


PulseBoard Provides
* A simple, unified, intelligent observability dashboard
* Aggregated signals from multiple sources
* Normalized, analyzed, and clearly presented incident data
* Reduced incident detection time, cognitive load, and operational chaos




2. Problem Statement
Pain Points for Early-Stage Startups
	Fragmented Monitoring
	Signals exist across multiple tools and dashboards with no unified view.
	Alert Noise
	Too many alerts without context or prioritization, leading to alert fatigue.
	Lack of Correlation
	Teams cannot easily connect deploy failures, error spikes, and uptime drops.
	No Central Incident View
	Engineers manually investigate across tools during incidents.
	Enterprise Tools Are Overkill
	Datadog and New Relic are expensive, complex, and designed for large orgs.
	



3. Product Goals
Primary Goals
	Secondary Goals
	* Centralize operational signals
* Reduce alert noise
* Provide deploy-error correlation
* Surface key incidents quickly
* AI-generated system behavior summaries
	* Provide historical analytics
* Enable reliability insights
* Improve incident response speed
	



4. Target Users
Primary Users
	Secondary Users
	* Early-stage startup teams
* Indie hackers
* Small SaaS teams (1-10 engineers)
* Dev-focused founders
	* DevOps engineers
* Engineering managers
* Reliability engineers
	



5. Key Product Principles
Design Principles
	Simplicity First
	Minimal setup and intuitive UI — no DevOps PhD required.
	Signal Over Noise
	Show important signals, hide raw data. Cut through alert fatigue.
	Opinionated Observability
	Provide curated insights rather than unlimited configurable dashboards.
	Contextual Intelligence
	Correlate deploys, errors, and uptime events automatically.
	



6. Core Features (MVP)
6.1 Authentication & Workspaces
Users must authenticate to access the system. Features include email/password login, workspace creation, team member invites, and role-based permissions.
Owner
	Admin
	Viewer
	

6.2 Project Management
Workspaces contain multiple projects, where each project corresponds to an application or service.
* Create project
* Connect integrations
* Configure monitoring rules


6.3 Integration System
GitHub
	Sentry
	UptimeRobot
	Deployments, CI failures, workflow runs, push events
	New issues, regressions, error spikes
	Downtime events, recovery events, uptime metrics
	

6.4 n8n Agents for Event Ingestion
PulseBoard uses n8n workflows as event ingestion agents. Each agent receives data via webhook or polling and follows this processing pipeline:
1. Receive Webhook
	2. Verify Signature
	3. Normalize Event
	4. Enrich Metadata
	5. Deduplicate
	6. Send to API
	

6.5 Event Normalization Layer
All incoming events are converted into a common schema with consistent fields: severity, source, timestamp, and identifiers.
Normalized Event Types
	• deploy_success
• error_spike
	• deploy_failed
• downtime_started
	• ci_failure
• downtime_resolved
	



6.6 – 6.9  Core Feature Summary
Feature Descriptions
	6.6 Events Inbox
	Central feed of all events: deploys, CI failures, error spikes, downtime alerts. Filterable by project, severity, time range, and source.
	6.7 Overview Dashboard
	24-hour health summary: deploy count, CI success rate, error volume, uptime %. Traffic-light indicators (Green / Amber / Red).
	6.8 AI Incident Summaries
	Per-event AI-generated summaries covering what happened, possible cause, and suggested next steps.
	6.9 Daily AI Digest
	Auto-generated daily summary via n8n scheduled workflow. Includes total deploys, top incidents, downtime summary, and reliability trends.
	

6.10 Superset Analytics Dashboards
Apache Superset connects to the analytics (PostgreSQL) database for BI-style analysis as event data grows.
* Error frequency trend
* Deploy success rate over time
* Downtime duration over time
* Top error fingerprints




7. Technical Architecture
Layer
	Technology
	Responsibility
	Frontend
	Vite + React + TanStack Query
	Dashboard, event feed, integration settings, workspace UI
	Backend API
	Node.js + Express.js
	Auth, workspaces, projects, integrations, events, AI services
	Event Agents
	n8n Workflows (webhooks)
	GitHub, Sentry, UptimeRobot event ingestion & normalization
	App Database
	MongoDB Atlas
	Users, workspaces, projects, integrations, alert rules
	Analytics DB
	PostgreSQL
	High-volume observability events for historical queries
	BI Layer
	Apache Superset
	Advanced analytics dashboards connected to PostgreSQL
	AI Layer
	Claude / LLM via MCP
	Incident summaries, anomaly explanations, daily digest generation
	Deployment
	Render
	Cloud hosting for all services
	

7.5 Event Flow (Example: GitHub CI Failure)
1
	CI Failure occurs
	GitHub detects a failed workflow run
	2
	Webhook sent
	GitHub sends an HTTP POST to the n8n agent endpoint
	3
	Agent receives event
	n8n GitHub agent validates the HMAC signature
	4
	Normalize payload
	Agent converts to PulseBoard's common event schema
	5
	Call ingestion API
	Agent POSTs normalized event to PulseBoard backend
	6
	Store event
	Backend writes event to PostgreSQL analytics store
	7
	Dashboard updates
	Frontend fetches updated events via TanStack Query
	8
	AI summary generated
	(Optional) AI layer produces incident summary
	



8 – 10. Requirements
Security Requirements
	Webhook Verification
	All webhooks must validate provider HMAC signatures before processing.
	Data Isolation
	Strict workspace-level tenant isolation — no cross-workspace data access.
	Token Protection
	Integration tokens encrypted at rest.
	Rate Limiting
	Ingestion endpoints protected against abuse with rate limiting middleware.
	Authentication
	JWT with refresh tokens stored in httpOnly cookies.
	Performance Requirements
	Event Ingestion
	Must handle high-volume webhook bursts with deduplication.
	Database Indexes
	projectId + timestamp, workspaceId + severity, event fingerprint.
	Analytics Queries
	PostgreSQL optimized for time-series queries at scale.
	Non-Functional Requirements
	Reliability
	System must tolerate webhook retries and process duplicate events idempotently.
	Scalability
	Analytics DB optimized for time-series; horizontally scalable backend.
	Observability
	PulseBoard must monitor itself via structured logs and metrics.
	



11. Risks & Mitigation
Risk
	Severity
	Mitigation
	Webhook Misconfiguration
	High
	Automated config validation on setup; clear error messages
	AI Hallucination
	Medium
	Ground AI summaries in structured event metadata; human review
	Integration Rate Limits
	Medium
	Exponential backoff, request queuing, caching
	Event Duplication
	Medium
	Fingerprint-based deduplication at ingestion layer
	Tenant Data Leakage
	High
	Workspace-scoped queries enforced at API middleware layer
	



12. Future Enhancements
* Slack alert rules
* Automated incident creation
* SLO tracking
* Root cause clustering
* Predictive anomaly detection
* Cost monitoring insights


13. Development Workflow
Development leverages modern AI-assisted tooling throughout the stack.
Tools & Automation
	Cursor
	Frontend scaffolding and component generation
	Claude Code
	Backend design, code review, and architecture guidance
	MCP
	AI tools interact with repo files, CI logs, testing workflows, and dev environment
	n8n
	Event ingestion agents and scheduled digest workflows
	Make.com
	Operational automation tasks
	



14. MVP Milestones
Phase
	Name
	Scope
	Phase 1
	Authentication & Workspace Management
	Email/password auth, workspace creation, team invites, RBAC roles (Owner, Admin, Viewer)
	Phase 2
	Integrations
	GitHub, Sentry, and UptimeRobot integrations via n8n agents, webhook verification, event normalization
	Phase 3
	Unified Events Dashboard
	Central event feed with filtering, overview dashboard with health indicators, event metadata
	Phase 4
	AI Incident Summaries
	Per-incident AI summaries, daily digest generation, contextual correlation of deploy-error events
	Phase 5
	Superset Analytics
	PostgreSQL analytics event store, Superset dashboards, historical trend visualization
	

PulseBoard PRD — Confidential    Page