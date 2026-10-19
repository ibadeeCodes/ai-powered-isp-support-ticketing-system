# ISP AI Support Ticketing System - Frontend

Next.js 14 App Router and TypeScript frontend with Tailwind CSS for the Internet Service Provider AI Support Ticketing System.

## Features

- **Next.js 14 App Router & React 18**: Fast server-side and client-side rendering.
- **Tailwind CSS & Lucide Icons**: Clean, responsive ISP dashboard UI.
- **Backend Ready**: Integrated API client connecting to NestJS backend (`http://localhost:3000`).
- **Resilient Fallback**: Includes preview sample data when the backend service is offline.
- **Interactive Portal**:
  - Operational health metrics and status indicators.
  - Interactive ticket creation modal with priority and customer tagging.
  - Search and status filter (Open, In Progress, Resolved).
  - AI Triage Diagnostic summaries per ticket.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (runs on port 3001 to avoid conflict with backend on 3000):
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Scripts

- `npm run dev`: Start Next.js development server on port 3001.
- `npm run build`: Create an optimized production build.
- `npm run start`: Run production build on port 3001.

