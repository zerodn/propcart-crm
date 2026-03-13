# PropCart Portal - Quick Start Guide

## What is the Portal?

The Portal is a **customer-facing web application** separate from the CRM admin panel. It allows customers to:

- Browse available real estate projects
- View detailed project information (layouts, amenities, progress, etc.)
- Download project documents
- Submit inquiries and contact brokers

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                 │
└────────────────┬──────────────────────────┬─────────────────┘
                 │                          │
         ┌───────▼──────────┐      ┌────────▼────────┐
         │  CRM Admin Panel  │      │ Customer Portal │
         │  (port 3001)      │      │  (port 3002)    │
         └────────┬──────────┘      └────────┬────────┘
                  │                          │
                  └──────────────┬───────────┘
                                 │
                        ┌────────▼─────────┐
                        │  Backend API     │
                        │  (port 3000)     │
                        └──────────────────┘
```

## Quick Start

### 1. Install Portal Dependencies

```bash
cd apps/portal
npm install
```

### 2. Configure Environment

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Start Portal Dev Server

```bash
npm run dev
```

Portal runs on: **http://localhost:3002**

### 4. (Alternative) Use Main Restart Script

From project root:

```bash
bash restart-servers.sh
```

This starts **Backend + CRM + Portal** together.

Or skip portal:

```bash
bash restart-servers.sh --no-portal
```

## Portal Pages

### Home Page (/)

- **URL**: http://localhost:3002
- **Purpose**: Browse projects
- **Features**:
  - Project grid/list view
  - Search by name/location
  - Filter by project type
  - Quick stats per project

### Project Detail Page (/projects/[id])

- **URL**: http://localhost:3002/projects/123
- **Purpose**: View full project details
- **Sections**:
  1. Hero banner (carousel)
  2. Project overview (stats, description)
  3. Photo gallery
  4. Amenities
  5. Subdivisions & towers
  6. Progress timeline
  7. Location map
  8. Documents download
  9. Contact form & team

## File Structure

```
apps/portal/
├── package.json              # Dependencies (port 3002, Next.js scripts)
├── next.config.mjs           # Next.js configuration
├── tailwind.config.ts        # TailwindCSS theme
├── tsconfig.json             # TypeScript config
├── .env.local                # Environment variables
├── .gitignore                # Git ignore rules
├── src/
│   ├── app/
│   │   ├── layout.tsx        ← Root HTML layout
│   │   ├── page.tsx          ← Home page (project list)
│   │   ├── globals.css       ← Theme CSS variables
│   │   └── projects/
│   │       └── [id]/
│   │           └── page.tsx  ← Project detail wrapper
│   ├── components/
│   │   ├── project/
│   │   │   └── project-page.tsx  ← Main project detail component
│   │   └── common/               ← Header, footer, etc. (to create)
│   ├── hooks/
│   │   └── useProject.ts     ← API hooks
│   ├── lib/
│   │   └── api-client.ts     ← Axios API client
│   ├── types/
│   │   ├── project.ts        ← TypeScript types
│   │   └── index.ts          ← Type exports
│   └── locales/              ← i18n translations (future)
└── README.md                 ← Full documentation
```

## API Integration

The portal communicates with the backend API to fetch projects:

```typescript
// Fetch all projects
const { projects } = useProjects();

// Fetch single project
const { project } = useProject(projectId);
```

See [apps/portal/src/hooks/useProject.ts](../portal/src/hooks/useProject.ts) for details.

## Styling & Theme

Portal uses **TailwindCSS** with CSS variables defined in `globals.css`. All colors and spacing follow Tailwind conventions:

```css
:root {
  --primary: 221.2 83.2% 53.3%;      /* Blue */
  --destructive: 0 84.2% 60.2%;      /* Red */
  /* ... more variables */
}
```

## Development Tips

### Hot Reload
Changes to `.tsx`, `.css`, and `.env.local` are auto-detected. Just save and the browser refreshes.

### Debug API Calls
Set `NEXT_PUBLIC_DEBUG=true` in `.env.local` to log API requests.

### Check Running Processes
```bash
lsof -i :3002
ps aux | grep node
```

### Kill Portal Process
```bash
pkill -f "next.*3002"
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Port 3002 in use | `lsof -i :3002 && kill -9 <PID>` |
| npm install fails | `rm -rf node_modules && npm install` |
| API 404 errors | Check `NEXT_PUBLIC_API_URL` in `.env.local` |
| Page blank | Check browser console (F12) for errors |

## Next Steps

1. ✅ Portal created and running on port 3002
2. ✅ Home page with project listing
3. ✅ Project detail page with all features
4. 🔲 Add header/footer components
5. 🔲 Implement contact form backend
6. 🔲 Add image lightbox viewer
7. 🔲 Add map integration (Google Maps)
8. 🔲 Add 360-degree viewer
9. 🔲 Implement i18n (English/Vietnamese)
10. 🔲 Add SEO/Meta tags per project

## Running Multiple Instances

You can run portal alongside CRM for development:

```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: CRM (port 3001)
cd apps/web && npm run dev

# Terminal 3: Portal (port 3002)
cd apps/portal && npm run dev
```

Or use the restart script:

```bash
bash restart-servers.sh
```

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Docker
See [Dockerfile](./Dockerfile) (to be created).

### Vercel / Netlify
Portal is a standard Next.js app, compatible with any Node.js host.

---

**Status**: ✅ Portal infrastructure ready
**Development**: In progress (home & detail pages complete)
**Ready**: To add custom components, styling, and features
