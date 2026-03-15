# PropCart CRM — Business Logic Summary (Baseline Version 1.0)

**Date**: March 15, 2026  
**Status**: Stable Release v1.0

---

## 1. System Overview

**PropCart CRM** is a **Real Estate SaaS Platform** serving 100k+ users with multi-tenant workspace-based architecture.

### Core Modules
- **Authentication & User Management**: JWT-based auth, workspace switching, device binding
- **Project Management**: Full CRUD with multi-step wizard UI
- **Lead & Pipeline**: Lead management with status tracking
- **Property Catalog**: Property listings with detailed specs
- **File Storage**: MinIO-based S3-compatible storage (workspace-scoped)
- **Portal**: Public-facing project detail view for customers

### Key Technologies
| Layer      | Stack                      |
|------------|----------------------------|
| Backend    | NestJS + TypeScript + Prisma |
| Database   | PostgreSQL 15+             |
| Cache      | Redis                      |
| Storage    | MinIO (S3-compatible)      |
| Frontend   | Next.js + TypeScript       |
| Auth       | JWT (15min access / 7d refresh) |

---

## 2. Architecture & Design Patterns

### 2.1 Microservice Design

```
┌─────────────────────────────┐
│   Next.js Web / Flutter App │
└────────────┬────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│      NestJS API Gateway          │
│  (Route, Rate Limit, Auth)       │
└────────┬─────────────┬────────────┘
         │             │
         ▼             ▼
    ┌────────┐    ┌────────┐
    │  Auth  │    │ Core   │
    │Service │    │Service │
    └────────┘    └────────┘
         │             │
         ▼             ▼
    [JWT + Keys] [Workspace, Project, Lead]
         +         [Property, Member, etc]
         │
         ▼ MinIO
    [File Storage]
```

**Services Breakdown**:
- **auth-service**: User login, JWT generation, password reset, device management
- **core-service**: Workspace management, project CRUD, lead pipeline, property catalog
- **upload-service**: File upload/download with MinIO integration

### 2.2 Multi-Tenant Architecture

Every business entity is scoped to **workspace_id**:

```typescript
// Database Query Pattern
WHERE workspace_id = $workspaceId AND deleted_at IS NULL
```

**Workspace Types**:
- `PERSONAL`: Single user workspace (default)
- `COMPANY`: Team workspace with multiple members + RBAC

**User Workspace Membership**:
```typescript
WorkspaceMember {
  workspaceId: string
  userId: string
  role: 'OWNER' | 'ADMIN' | 'SALES' | 'MANAGER' | 'VIEWER'
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
}
```

### 2.3 Request Guard Chain (Security)

Every protected endpoint follows this pattern:

```typescript
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
@Post('projects')
async createProject(@Body() dto: CreateProjectDto, @Req() req) {
  // req.user = { userId, workspaceId, role, deviceId }
}
```

**Guard Sequence**:
1. **JwtAuthGuard**: Validate JWT token, extract user
2. **WorkspaceGuard**: Verify workspace membership is ACTIVE
3. **PermissionGuard**: Check `role` has required permission (e.g., PROJECT_CREATE)

---

## 3. Project Management API

### 3.1 Data Model

**Project** entity with nested structures:

```typescript
Project {
  id: string
  workspaceId: string (!)              // Multi-tenant key
  name: string
  projectType: 'HIGH_RISE' | 'LOW_RISE'
  displayStatus: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'
  saleStatus: 'COMING_SOON' | 'ON_SALE' | 'SOLD_OUT'

  // Step 0: Overview
  overviewHtml: string                 // Rich text (Tiptap editor)
  videoUrl: string                     // YouTube/Drive embed
  videoDescription: string             // Rich text
  contacts: ContactItem[]              // Advisor contact info
  planningStats: PlanningStatItem[]    // 3-column stats (density, area, etc)

  // Step 1: Location
  address: string
  province, district, ward: string
  latitude, longitude: string
  googleMapUrl: string
  locationDescriptionHtml: string

  // Step 2: Subdivisions (towers/phases)
  subdivisions: SubdivisionItem[] {
    name: string
    towers: TowerItem[] {
      name: string
      floorCount: number
      unitCount: number
      constructionProgress: string    // NEW: e.g., "60% hoàn thành"
      handoverStandard: string
      floorPlanImages: FloorPlanImage[]
      fundProducts: TowerFundProduct[] // Inventory (units)
    }
  }

  // Step 3: Progress Updates
  progressUpdates: ProgressUpdateItem[] {
    label: string                      // Name of milestone
    detailHtml: string                 // Rich text description
    images: MediaItem[]                // Before/after photos
    videos: VideoItem[]                // Construction videos
  }

  // Step 4: Documents
  documentItems: DocumentItem[] {
    documentType: string               // "Sales Policy", "Legal Doc", etc
    documentUrl: string                // Link to file
    icon: string                       // Emoji or URL
  }

  // Media (all tabs)
  bannerUrls: MediaItem[]              // Hero banners
  zoneImages: MediaItem[]              // Floor plan layouts
  productImages: MediaItem[]           // Product showcase
  amenityImages: MediaItem[]           // Amenities

  // Metadata
  createdAt, updatedAt: datetime
  deletedAt: datetime | null           // Soft delete
}
```

### 3.2 API Endpoints

**Project CRUD**:

```typescript
// Create (step 0)
POST /api/workspaces/:workspaceId/projects
Body: { name, overviewHtml, videoUrl, videoDescription, contacts, planningStats, ... }
Response: { data: Project, meta: {} }

// Read
GET /api/workspaces/:workspaceId/projects/:projectId
Response: { data: Project, meta: {} }

// List
GET /api/workspaces/:workspaceId/projects?page=1&limit=20&search=...
Response: { data: Project[], meta: { total, page, limit } }

// Update (multi-step)
PATCH /api/workspaces/:workspaceId/projects/:projectId
Body: { overviewHtml, videoUrl, subdivisions, progressUpdates, documentItems, ... }
Response: { data: Project, meta: {} }

// Delete (soft)
DELETE /api/workspaces/:workspaceId/projects/:projectId
Response: { data: {}, meta: {} }

// Publish
PATCH /api/workspaces/:workspaceId/projects/:projectId/publish
Body: { displayStatus: 'PUBLISHED' }
Response: { data: Project, meta: {} }
```

### 3.3 Backend Business Logic (NestJS Service)

**File**: `src/modules/project/project.service.ts`

**Key Methods**:

```typescript
export class ProjectService {
  async createProject(workspaceId: string, dto: CreateProjectDto) {
    // 1. Validate workspace exists
    // 2. Create project with workspace_id
    // 3. Initialize empty subdivisions[] if not provided
    // 4. Return project with all defaults
  }

  async updateProject(
    workspaceId: string,
    projectId: string,
    dto: UpdateProjectDto
  ) {
    // 1. Fetch existing project (query by workspace_id + id)
    // 2. Merge DTO selectively:
    //    - If dto.overviewHtml !== undefined → update field
    //    - If dto.overviewHtml === undefined → skip (don't overwrite)
    // 3. Save to database
    // 4. Emit event 'project.updated' for Portal sync
    // 5. Return updated project
  }

  async getProject(workspaceId: string, projectId: string) {
    // 1. Query: SELECT * FROM project WHERE workspace_id = $wId AND id = $pId AND deleted_at IS NULL
    // 2. Validate not soft-deleted
    // 3. Return with all nested data populated (via Prisma include)
  }

  async publicGetProject(projectSlug: string) {
    // Portal: Get project WITHOUT workspace auth check
    // Only return if displayStatus === 'PUBLISHED'
    // Always populate all media/contacts/progressUpdates
  }

  async deleteProject(workspaceId: string, projectId: string) {
    // Soft delete: UPDATE project SET deleted_at = NOW() WHERE workspace_id = ...
  }
}
```

**Step-Based Payload Logic**:

The backend accepts **partial payloads** per step, updating ONLY provided fields:

```typescript
// Step 0: Overview payload
{
  overviewHtml: "<p>...",
  videoUrl: "https://youtube.com/...",
  videoDescription: "<p>...",
  contacts: [...],
  planningStats: [...]
}
// ✅ Updates only these fields, preserves subdivisions, progressUpdates, documentItems

// Step 1: Location payload
{
  address: "...",
  latitude: "...",
  googleMapUrl: "..."
}
// ✅ Updates location fields only

// Step 2: Subdivisions payload
{
  subdivisions: [
    {
      name: "Phase 1",
      towers: [
        {
          name: "Tower A",
          constructionProgress: "60%",  // NEW field
          ...
        }
      ]
    }
  ]
}
// ✅ Replaces entire subdivisions array

// Step 4: Documents payload (final save)
{
  documentItems: [...]
}
// ✅ Only saves documents, doesn't touch other fields
```

---

## 4. Frontend Multi-Step Wizard (Next.js)

### 4.1 Project Form Architecture

**File**: `apps/web/src/components/project/project-form.tsx`

**Component Structure**:

```
ProjectForm (Main Component)
├── Step 0: Overview
│   ├── RichTextEditor (Tiptap) → overviewHtml
│   ├── Video URL input → videoUrl
│   ├── Video Description editor → videoDescription
│   ├── Contacts list → contacts[]
│   └── Planning Stats grid → planningStats[]
│
├── Step 1: Location
│   ├── Address, Province, District input
│   ├── Latitude/Longitude picker
│   ├── Google Map URL input
│   └── Location Description editor
│
├── Step 2: Subdivisions (Towers)
│   ├── List of phases/subdivisions
│   ├── Tower Editor Dialog (NEW)
│   │   ├── Tower name, floor count, unit count
│   │   ├── Construction Progress field (NEW)
│   │   ├── Handover standard
│   │   └── Save/Cancel buttons
│   └── Add/Edit/Delete tower
│
├── Step 3: Progress Updates
│   ├── Milestone timeline
│   ├── Images upload
│   └── Video & description
│
└── Step 4: Documents
    ├── Document list grid
    ├── Upload & drag-drop
    └── Final submit button
```

### 4.2 Step-Based Save Logic

**Key Functions**:

```typescript
// Get payload for current step (fields only)
function getStepPayload(step: number) {
  switch(step) {
    case 0: return buildOverviewStepPayload()  // Overview only
    case 1: return buildLocationPayload()      // Location only
    case 2: return buildSubdivisionsPayload()  // Subdivisions only
    case 3: return buildProgressPayload()      // Progress only
    case 4: return buildDocumentsPayload()     // Documents only
  }
}

// On next step button
async function handleNextStep() {
  const payload = getStepPayload(currentStep)
  const result = await onSubmit(payload, { silent: true })
  if (result.ok) setCurrentStep(currentStep + 1)
}

// On back button (NEW)
async function handlePrevStep() {
  const payload = getStepPayload(currentStep)
  const result = await onSubmit(payload, { silent: true })
  if (result.ok) setCurrentStep(currentStep - 1)
}

// On final submit (step 4)
async function handleSubmit() {
  const payload = getStepPayload(currentStep)  // Only documentItems
  const result = await onSubmit(payload, { silent: false })
  if (result.ok) {
    toast.success('Project saved')
    closeForm()
  }
}
```

### 4.3 State Sync Pattern (NEW)

**Problem**: After silent save (step navigation), `editingProject` from API response needs to re-sync into form fields WITHOUT resetting `currentStep`.

**Solution**: Multiple useEffect hooks for different concerns:

```typescript
// useEffect 1: Initial load of form when opening
useEffect(() => {
  if (isOpen && editingProject) {
    setOverviewHtml(editingProject.overviewHtml ?? '')
    setVideoUrl(editingProject.videoUrl ?? '')
    // ... initialize all fields
    setCurrentStep(0)  // Start from step 0
  }
}, [isOpen, editingProject?.id])  // Only re-run on open/project change

// useEffect 2: Sync data after silent save (don't reset step)
useEffect(() => {
  if (!isOpen || !editingProject) return
  // Only sync overviewHtml/videoDescription after save
  if (editingProject.overviewHtml !== null && editingProject.overviewHtml !== undefined) {
    setOverviewHtml(editingProject.overviewHtml)
  }
  if (editingProject.videoDescription !== null && editingProject.videoDescription !== undefined) {
    setVideoDescription(editingProject.videoDescription)
  }
  // ✅ DON'T reset currentStep or other fields
}, [editingProject])  // Re-run after every API response
```

### 4.4 Tiptap Editor Integration

**Challenge**: RichTextEditor (Tiptap) initialization timing - must receive HTML on first render.

**Solution**: useState lazy initializer with props:

```typescript
// ❌ Wrong: Always starts empty, useEffect syncs later (flicker)
const [overviewHtml, setOverviewHtml] = useState('')

// ✅ Right: Initialize with current project value
const [overviewHtml, setOverviewHtml] = useState(
  editingProject?.overviewHtml ?? ''
)

// Editor receives correct HTML on mount
<RichTextEditor value={overviewHtml} onChange={setOverviewHtml} />
```

### 4.5 Data Persistence

**Payload Building for Step 0 (Overview)**:

```typescript
function buildOverviewStepPayload() {
  return {
    // Tiptap editors: use || null (not || undefined)
    overviewHtml: overviewHtml || null,      // Save empty as null, not undefined
    videoDescription: videoDescription || null,
    videoUrl: videoUrl || null,

    // Arrays
    contacts: contacts.filter(c => c.name),
    planningStats: planningStats.filter(s => s.label),
    
    // IMPORTANT: Exclude subdivisions/progressUpdates/documentItems
    // Otherwise they would overwrite with empty arrays
  }
}
```

**Why `|| null` not `|| undefined`?**

Backend query pattern:
```typescript
// If field === undefined → Skip update (don't overwrite)
export async function buildUpdateData(dto: UpdateProjectDto) {
  return {
    ...(dto.overviewHtml !== undefined && { overviewHtml: dto.overviewHtml }),
    ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
    // If not included → field untouched in database
  }
}

// Using || null ensures field always included in DTO
if (overviewHtml === '') setOverviewHtml(null)  // Backend sees null = "clear field"
```

---

## 5. Portal (Public Display)

### 5.1 Architecture

**Portal** is a separate Next.js app for public customers to view project details.

**URL Pattern**: `portal.propcart.com/du-an/{slug}`

### 5.2 Project Detail Tabs

**File**: `apps/portal/src/components/project/project-detail.tsx`

**5 Main Tabs**:

| Tab        | Components | Data Source        |
|------------|------------|-------------------|
| **Tổng quan** | Banners, stats, overview HTML, video intro | overviewHtml, videoUrl, videoDescription |
| **Vị trí** | Address, map, location description | address, latitude, googleMapUrl, locationDescriptionHtml |
| **Phân khu** | SubdivisionsTab component with tower details | subdivisions[], towers[], fundProducts[] |
| **Kho tài liệu** | Document grid with search | documentItems[] |
| **Tiến độ** | Progress timeline, images, videos | progressUpdates[] |

### 5.3 Sticky Header Layout (NEW FIX)

**Problem**: Planning stats header (3-column stats) was covering "Tổng quan" section when scrolling.

**Solution**: Dynamic sticky positioning with z-index hierarchy:

```typescript
// 1. Measure header height dynamically
const planningStatsRef = useRef<HTMLDivElement>(null)
const [sidebarTop, setSidebarTop] = useState(80)

useEffect(() => {
  function updateSidebarTop() {
    const height = planningStatsRef.current?.offsetHeight ?? 80
    setSidebarTop(height + 8)  // 8px gap
  }
  updateSidebarTop()
  window.addEventListener('resize', updateSidebarTop)
  return () => window.removeEventListener('resize', updateSidebarTop)
}, [project?.planningStats])

// 2. Apply dynamic top to sidebars
<div className="sticky z-10" style={{ top: sidebarTop }}>
  {/* Left nav / Right contact */}
</div>

// 3. Z-index hierarchy
<div z-50>Planning stats header (highest)</div>
<div z-10 style={{ top }}>Left sidebar (middle)</div>
<div z-0>Center content (bottom)</div>
```

### 5.4 Rich Text Display

**Tiptap HTML Content** rendered safely:

```typescript
{project.overviewHtml && (
  <div
    className="prose prose-sm max-w-none text-gray-700 
               [&_h2]:text-lg [&_h2]:font-semibold 
               [&_p]:text-sm [&_p]:mb-3"
    dangerouslySetInnerHTML={{ __html: project.overviewHtml }}
  />
)}
```

**Tailwind Prose Styling**: Ensures proper typography for headings, paragraphs, lists.

---

## 6. File Upload & Storage (MinIO)

### 6.1 Workspace-Scoped Storage Structure

```
propcart-crm (bucket)
├── {workspace_id}/
│   ├── documents/
│   │   ├── profile/{userId}/{YYYY-MM-DD}/{uuid}.{ext}    ← User profile docs
│   │   └── members/{YYYY-MM-DD}/{uuid}.{ext}             ← Member docs
│   ├── avatars/{userId}/{YYYY-MM-DD}/{uuid}.{ext}        ← User avatars
│   ├── properties/{YYYY-MM-DD}/{uuid}.{ext}              ← Project images
│   └── temp/{uuid}.{ext}                                 ← Temp files (TTL 24h)
└── documents/users/{userId}/{YYYY-MM-DD}/{uuid}.{ext}    ← Legacy (backward compat)
```

### 6.2 Upload Methods (Backend Service)

```typescript
export class MinIOService {
  async uploadPropertyImage(
    workspaceId: string,
    file: Express.Multer.File
  ) {
    const key = `${workspaceId}/properties/${dateString}/${uuid}.${ext}`
    const url = await minio.putObject(bucket, key, file.buffer)
    return { url, key }
  }

  async uploadUserDocument(
    userId: string,
    file: Express.Multer.File,
    workspaceId?: string
  ) {
    // Production: {workspace_id}/documents/profile/{userId}/{date}/{uuid}.{ext}
    // Fallback: documents/users/{userId}/{date}/{uuid}.{ext}
    const key = workspaceId
      ? `${workspaceId}/documents/profile/${userId}/${dateString}/${uuid}.${ext}`
      : `documents/users/${userId}/${dateString}/${uuid}.${ext}`
    const url = await minio.putObject(bucket, key, file.buffer)
    return { url, key }
  }
}
```

### 6.3 Frontend Upload Flow

**Property Images** (project form):

```typescript
// Step 0: User uploads images via drag-drop
// Frontend sends to:
POST /api/upload/property-images
Body: FormData { files: File[], workspaceId }
Response: [{ originalUrl, fileName, thumbnailUrl }, ...]

// Backend:
// 1. Generate S3 key: {workspace_id}/properties/{date}/{uuid}.{ext}
// 2. Upload to MinIO
// 3. Return public URL
// 4. Frontend stores in local state
```

---

## 7. Key Features Implemented

### 7.1 Project Management
✅ Multi-step wizard (5 steps)  
✅ Auto-save on step navigation  
✅ Rich text editing (Tiptap)  
✅ Video embed (YouTube/Google Drive)  
✅ File uploads (document, images)  
✅ Construction progress tracking  
✅ Tower/Phase management  
✅ Soft delete (archived projects)  

### 7.2 Multi-Tenant & Security
✅ Workspace isolation (every query scoped)  
✅ RBAC (role-based access control)  
✅ JWT auth (15min access, 7d refresh)  
✅ Permission guards (3-layer: JWT → Workspace → Permission)  
✅ Device binding (token + device_hash)  

### 7.3 Portal Features
✅ Public project view  
✅ Dynamic sticky headers (no cover issue)  
✅ Rich text HTML rendering  
✅ Responsive image galleries  
✅ Tower detail modal with specs  
✅ Search & filter documents  
✅ Progress timeline with videos  
✅ Contact advisor section  

### 7.4 Data Integrity
✅ Soft delete (logical, not physical)  
✅ Timestamp tracking (createdAt, updatedAt)  
✅ Workspace partitioning  
✅ Transaction safety  
✅ Index optimization (workspace_id + id)  

---

## 8. Development Best Practices

### 8.1 API Response Format

**Success**:
```json
{ "data": { /* payload */ }, "meta": { "page": 1, "total": 100 } }
```

**Error**:
```json
{ "code": "PROJECT_NOT_FOUND", "message": "Dự án không tồn tại", "statusCode": 404 }
```

### 8.2 Database Queries

Every query must include workspace_id:
```typescript
// ✅ Correct
SELECT * FROM projects WHERE workspace_id = $1 AND deleted_at IS NULL

// ❌ Never do this
SELECT * FROM projects WHERE id = $1  // Cross-tenant leak!
```

### 8.3 Frontend State Management

**useState Lazy Initializer**:
```typescript
// Props: value used as initial state (props might come from hook)
const [html, setHtml] = useState(props.initialValue ?? '')
```

**Multiple useEffect for concerns**:
```typescript
// Load effect (one-time on modal open)
useEffect(() => { /* setup step 0 */ }, [isOpen, props?.id])

// Sync effect (after every API call)
useEffect(() => { /* sync fields */ }, [props])
```

### 8.4 Naming Conventions

| Target              | Convention      | Example                |
|---------------------|-----------------|------------------------|
| Database tables     | snake_case      | workspace_members      |
| Database columns    | snake_case      | workspace_id           |
| Prisma models       | PascalCase      | WorkspaceMember        |
| API routes          | kebab-case      | POST /projects/123/publish |
| Routes file         | snake_case.ts   | project.controller.ts  |
| Frontend components | PascalCase      | ProjectForm.tsx        |

---

## 9. Git Commit Log (Baseline v1.0)

### Major Features in v1.0
1. Project CRUD with multi-step wizard
2. Tower/subdivision management with construction progress
3. MinIO file storage (workspace-scoped)
4. Portal public view with dynamic sticky headers
5. Rich text editing (Tiptap)
6. Multi-tenant architecture
7. JWT + RBAC security
8. Soft delete for projects
9. Responsive UI (mobile + desktop)

### Commit Strategy
All changes consolidated into **baseline version 1.0**:
- Backend: API endpoints, services, database schema
- Frontend (Web): Project form, table, modals
- Frontend (Portal): Project detail view with all tabs
- Tests: Unit + E2E coverage (if available)
- Documentation: This file

---

## 10. Future Enhancements (Post v1.0)

### High Priority
- [ ] Project template system
- [ ] Bulk actions (archive, publish, delete)
- [ ] Advanced search & filtering
- [ ] Export to PDF (project flyer)
- [ ] Email notifications on project update

### Medium Priority
- [ ] Project comparison (side-by-side)
- [ ] Custom branding for Portal
- [ ] Image compression & CDN caching
- [ ] Version history (audit log)
- [ ] Batch upload (Excel)

### Low Priority
- [ ] AI-powered property categorization
- [ ] Chatbot for customer inquiries
- [ ] AR preview for 360 tours
- [ ] SMS alerts for new projects

---

## 11. How to Run (Development)

```bash
# Backend
cd ../nest-backend
npm install
npm run dev

# Web Frontend
cd apps/web
npm install
npm run dev    # http://localhost:3000

# Portal Frontend
cd apps/portal
npm install
npm run dev    # http://localhost:3002

# MinIO (Docker)
docker-compose up minio
# Access: http://localhost:9000 (user/pass: minioadmin/minioadmin)
```

---

**Document Version**: 1.0  
**Last Updated**: March 15, 2026  
**Status**: Live & Stable
