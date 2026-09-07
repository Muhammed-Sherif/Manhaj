# Manhaj - Offline-First Student Question Bank

A full-stack monorepo project for students to browse lecture resources and solve questions offline, with an admin dashboard for content management.

## Monorepo Structure

```
/
├── apps/
│   ├── api/            → Node.js + Express + TypeScript backend
│   ├── mobile/         → React Native (Expo) app — for STUDENTS
│   └── dashboard/       → React web app — for the ADMIN
├── packages/
│   ├── db/              → Drizzle ORM schema + migrations, PostgreSQL
│   ├── api-spec/        → OpenAPI specification generated from API routes
│   └── api-client/       → Generated via Orval from OpenAPI spec (TypeScript + react-query hooks)
├── package.json (workspace root)
└── pnpm-workspace.yaml
```

## Tech Stack

- **Package Manager**: pnpm workspaces
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM
- **Mobile (Student)**: React Native via Expo, NativeWind, Zustand, React Hook Form, Expo SQLite, expo-auth-session
- **Dashboard (Admin)**: React, Tailwind CSS, Zustand, React Hook Form, Auth.js
- **API Contract**: OpenAPI spec generated from API routes (swagger-jsdoc); Orval generates typed react-query client with TypeScript
- **Type Safety**: All types generated from OpenAPI spec, ensuring backend/frontend consistency

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your database credentials

# Generate database migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Generate OpenAPI spec from API routes
pnpm generate:openapi

# Generate typed API client (run after any API changes)
pnpm generate:client
```

### Development

```bash
# Start API backend
pnpm dev

# Start mobile app (from apps/mobile directory)
cd apps/mobile
pnpm start

# Start dashboard (from apps/dashboard directory)
cd apps/dashboard
pnpm dev
```

## Database Schema

The database uses Drizzle ORM with PostgreSQL. Key tables:

- **Academic Hierarchy**: grades → terms → modules → subjects → lectures
- **Content**: lecture_videos, lecture_files (linked to lectures)
- **Users**: Single table with authProvider (google/credentials) and role (student/admin)
- **Questions**: With nullable lectureId (for unclassified questions from Telegram)
- **Choices**: Normalized separate table
- **Attempts**: With unique constraint on (userId, questionId) for idempotent writes
- **Flags**: User flags for questions
- **Video Progress**: Track watch position for resume functionality

## API Endpoints

### Auth
- POST /auth/google - Google authentication
- POST /auth/register - Email/password registration
- POST /auth/login - Email/password login
- POST /auth/refresh - Refresh access token
- POST /auth/logout - Logout

### Admin (requires admin role)
- POST /admin/questions - Create question
- GET /admin/questions?lectureId= - Get questions (support null for unclassified)
- PATCH /admin/questions/bulk-assign-lecture - Bulk assign questions to lecture
- PATCH /admin/questions/:id - Update question
- DELETE /admin/questions/:id - Delete question
- POST /admin/lectures - Create lecture
- GET /admin/lectures?subjectId= - Get lectures
- POST /admin/lectures/:id/videos - Add video to lecture
- POST /admin/lectures/:id/files - Add file to lecture

### Student
- POST /student/attempts/sync - Sync question attempts (idempotent)
- GET /student/attempts/wrong-or-flagged - Get wrong/flagged questions for review
- POST /student/flags - Flag a question
- DELETE /student/flags/:questionId - Remove flag
- GET /student/profile - Get the authenticated student's profile and selected term
- PATCH /student/profile - Set the authenticated student's term
- GET /student/grades-with-terms - Get the grade and term picker tree
- POST /student/devices/register - Register an Expo push token
- DELETE /student/devices/register - Unregister an Expo push token

### Content
- GET /content/sync?since=<cursor> - Delta sync of all content
- GET /content/lectures/:id/videos - Get lecture videos
- POST /content/video-progress - Update video watch progress

## Offline Architecture

The mobile app follows a local-first approach:

1. All question attempts are written to local SQLite first
2. Correctness checking happens entirely on client (from synced data)
3. Background sync engine retries failed API calls
4. Server-side writes are idempotent (ON CONFLICT DO NOTHING)

## Project Status

- ✅ Monorepo structure set up
- ✅ Drizzle ORM schema with all tables and constraints
- ✅ API backend with Express + TypeScript
- ✅ Authentication middleware (supports both JWT and Auth.js sessions)
- ✅ Admin routes (questions, lectures management)
- ✅ Student routes (attempts, flags, content sync)
- ✅ Content routes (sync, lecture videos, video progress)
- ✅ OpenAPI spec generation setup
- ✅ Orval client configuration
- ⏳ React dashboard for admin (structure created)
- ⏳ React Native mobile app for students (structure created)
- ⏳ Offline sync implementation in mobile app
- ⏳ Complete documentation

## Next Steps

1. Complete OpenAPI spec generation and Orval client setup
2. Implement dashboard UI components and routing
3. Implement mobile app screens and offline SQLite integration
4. Add sync engine for offline functionality
5. Testing and deployment setup
