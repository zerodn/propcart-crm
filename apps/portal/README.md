# PropCart Portal

Customer-facing portal application for PropCart CRM. Displays project listings, details, and enables customer inquiries.

## Overview

- **Next.js 14** with React 18
- **TailwindCSS** for styling
- **TypeScript** for type safety
- **Port**: 3002

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (project list)
│   ├── globals.css         # Global styles
│   └── projects/
│       └── [id]/
│           └── page.tsx    # Project detail page
├── components/
│   ├── common/             # Common components (header, footer, etc.)
│   └── project/            # Project-specific components
│       └── project-page.tsx # Main project detail component
├── hooks/
│   └── useProject.ts       # API hooks for projects
├── lib/
│   └── api-client.ts       # Axios API client
├── types/
│   ├── project.ts          # TypeScript types
│   └── index.ts            # Type exports
└── locales/                # i18n resources (future)
```

## Setup & Installation

### 1. Install Dependencies

```bash
cd apps/portal
npm install
```

### 2. Configure Environment

Create `.env.local` with API endpoint:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

Portal will be available at: **http://localhost:3002**

## Features

### Home Page `/`
- Project listing/grid view
- Search by project name or location
- Filter by project type
- Quick stats display (units, area)
- Status badges (Planning, Construction, Selling, Completed)

### Project Detail Page `/projects/[id]`
- Hero banner with image carousel
- Project overview with stats
- Photo gallery
- Amenities grid
- Subdivisions & towers information
- Project progress timeline
- Location information
- Document downloads
- Contact form & team members
- Status and project type badges

## API Endpoints Used

- `GET /projects` - List all projects
- `GET /projects/:id` - Get project details

## Styling

Uses TailwindCSS with custom theme matching CRM design. All CSS variables are defined in `src/app/globals.css`.

## Development

### Type Checking

```bash
npm run type-check
```

### Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Component Usage

### useProject Hook

```tsx
import { useProject, useProjects } from '@/hooks/useProject';

// Single project
const { project, loading, error } = useProject(projectId);

// Multiple projects with filters
const { projects, loading, error, total } = useProjects({
  type: 'apartment',
  status: 'SELLING'
});
```

### ProjectPage Component

```tsx
import ProjectPage from '@/components/project/project-page';

<ProjectPage projectId="123" />
```

## Types

### Project Type

```tsx
interface Project {
  id: string;
  name: string;
  type?: string;
  status?: 'PLANNING' | 'CONSTRUCTION' | 'COMPLETED' | 'SELLING';
  location?: ProjectLocation;
  description?: string;
  bannerUrls?: string[];
  planningStats?: ProjectPlanningStats;
  progressUpdates?: ProjectProgressUpdate[];
  documents?: ProjectDocument[];
  subdivisions?: ProjectSubdivision[];
  // ... more fields
}
```

See `src/types/project.ts` for complete type definitions.

## Deployment

### Docker

```bash
docker build -f apps/portal/Dockerfile -t propcart-portal .
docker run -p 3002:3000 propcart-portal
```

### Vercel

```bash
vercel deploy apps/portal
```

## Troubleshooting

### Port Already in Use

```bash
lsof -i :3002
kill -9 <PID>
```

### npm Install Issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### API Connection Errors

- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Ensure backend is running on port 3000
- Check CORS configuration on backend

## Related Documentation

- [PropCart CRM Guide](../../CLAUDE.md)
- [Portal Setup Instructions](../../docs/PORTAL_SETUP.md) (if exists)

## Support

For issues or questions, refer to the main [PropCart CRM Documentation](../../README.md).
