# Fix: Multi-Step Form Auto-Save on Navigation

## Problem Description

Khi chỉnh sửa dự án và toà nhà tòa nhà (multi-step wizard), người dùng gặp 2 vấn đề:

1. **Project Overview Tab**: Trường "Tổng quan dự án" (overviewHtml) và "Mô tả video" (videoDescription) không được lưu khi nhấn "Tiếp tục" hoặc "Quay lại"
2. **Tower Construction Progress**: Trường "Tiến độ thi công" (constructionProgress) không được lưu lại khi chỉnh sửa toà nhà

## Root Causes

### Issue 1: Step payload included ALL fields, not just step-specific fields
- **Location**: `apps/web/src/components/project/project-form.tsx` - function `getStepPayload()`
- **Problem**: Step 0 (Overview) called `buildOverviewPayload()` which returned:
  - ✓ Overview fields (overviewHtml, videoDescription, etc)
  - ✗ ALSO contacts, planningStats, progressUpdates, documentItems, subdivisions
- **Impact**: Saving Step 0 overwrote subdivisions/progressUpdates/documentItems with empty arrays

### Issue 2: Missing `constructionProgress` field in DTO
- **Location**: `src/modules/project/dto/index.ts` - class `ProjectTower`
- **Problem**: `ProjectTower` DTO didn't have `constructionProgress?: string;` field
- **Impact**: Frontend sent the field but backend validation rejected it or didn't map it to DB

### Issue 3: Navigation without auto-save
- **Location**: Project wizard "Quay lại" button & Tower dialog "Quay lại" button
- **Problem**: Buttons directly changed step without saving data first
- **Impact**: Data loss when user navigated back without explicit save

## Solutions Applied

### 1. ✅ Added `constructionProgress` to ProjectTower DTO

**File**: `src/modules/project/dto/index.ts`

```typescript
export class ProjectTower {
  // ... existing fields ...
  
  @IsString()
  @IsOptional()
  handoverStandard?: string;

  @IsString()
  @IsOptional()
  constructionProgress?: string;  // ← NEW FIELD

  @IsString()
  @IsOptional()
  constructionStartDate?: string;
  // ...
}
```

### 2. ✅ Created `buildOverviewStepPayload()` function

**File**: `apps/web/src/components/project/project-form.tsx`

```typescript
// Only returns Step 0 specific fields
// EXCLUDES: subdivisions, progressUpdates, documentItems
const buildOverviewStepPayload = (): Partial<CreateProjectPayload> => {
  // ... sanitize contacts ...
  return {
    name: name.trim(),
    projectType,
    ownerId: ownerId || undefined,
    displayStatus,
    saleStatus,
    bannerUrl: bannerItems[0]?.originalUrl || undefined,
    bannerUrls: toCollectionField(bannerItems),
    overviewHtml: overviewHtml || undefined,           // ✅ SAVED
    zoneImages: toCollectionField(zoneItems),
    productImages: toCollectionField(productItems),
    amenityImages: toCollectionField(amenityItems),
    videoUrl: videoUrl || undefined,
    videoDescription: videoDescription || undefined,  // ✅ SAVED
    contacts: toCollectionField(sanitizedContacts),
    planningStats: toCollectionField(planningStats.filter((s) => s.label && s.value)),
    // NOTE: DO NOT include subdivisions, progressUpdates, documentItems
    // Those are handled by their respective steps
  };
};
```

### 3. ✅ Updated Step Payloads to be Granular

**File**: `apps/web/src/components/project/project-form.tsx` - function `getStepPayload()`

```typescript
const getStepPayload = (step: number): Partial<CreateProjectPayload> => {
  if (step === 0) {
    return buildOverviewStepPayload();    // ← Step 0: overview only
  }
  if (step === 1) {
    return buildLocationPayload();        // ← Step 1: location only
  }
  if (step === 2) {
    return {
      subdivisions: toCollectionField(subdivisions),  // ← Step 2: subdivisions only
    };
  }
  if (step === 3) {
    return {
      progressUpdates: toCollectionField(/* ... */),  // ← Step 3: progress only
    };
  }
  if (step === 4) {
    return {
      documentItems: toCollectionField(/* ... */),    // ← Step 4: documents only
    };
  }
  return {};
};
```

### 4. ✅ Added Auto-Save on "Quay lại" for Project Steps

**File**: `apps/web/src/components/project/project-form.tsx`

```typescript
// New function: saves current step before navigating back
const handlePrevStep = async () => {
  if (draftProjectId) {
    const payload = getStepPayload(currentStep);
    const saved = await onSubmit(payload, {
      closeAfterSave: false,
      projectId: draftProjectId,
      silent: true,
    });

    if (!saved) return;
  }

  setCurrentStep((s) => Math.max(0, s - 1));
};
```

**Updated Button**:
```typescript
{!isFirstStep && (
  <button
    type="button"
    onClick={handlePrevStep}  // ← Changed from setCurrentStep directly
    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
  >
    <ChevronLeft className="w-4 h-4" /> Quay lại
  </button>
)}
```

### 5. ✅ Added Auto-Save on "Quay lại" for Tower Steps

**File**: `apps/web/src/components/project/project-form.tsx`

```typescript
// New function: saves tower step before navigating back
const handleTowerPrevStep = async () => {
  const ok = await persistTowerStep();  // Validates and saves tower data
  if (!ok) return;

  setTowerCurrentStep((step) => Math.max(0, step - 1));
};
```

**Updated Tower Dialog "Quay lại" Button**:
```typescript
{towerDrawerMode !== 'view' && towerCurrentStep > 0 && (
  <button
    type="button"
    onClick={() => {
      void handleTowerPrevStep();  // ← Changed from setTowerCurrentStep directly
    }}
    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
  >
    <ChevronLeft className="h-4 w-4" /> Quay lại
  </button>
)}
```

## Verification

### Before Fixes
- Step 0 (Overview) save overwrites subdivisions with empty array
- `constructionProgress` sent from frontend but rejected by backend
- "Quay lại" loses current step data

### After Fixes
- Step 0 only saves overview fields (overviewHtml, videoDescription, etc)
- Step 2 only saves subdivisions (including constructionProgress)
- Step 3 only saves progressUpdates
- Step 4 only saves documentItems
- "Tiếp tục" saves current step and advances
- "Quay lại" saves current step and goes back

## Testing Checklist

- [ ] Edit project → Step 0 (Overview) → Enter text in "Tổng quan dự án" and "Mô tả video" → Click "Tiếp tục" → Verify saved in database
- [ ] Edit project → Step 0 → Make changes → Click "Quay lại" → Verify data saved (if it was Step 1+)
- [ ] Edit project → Step 2 (Subdivisions) → Edit tower → Step 1 (Tower Location) or Step 2 (Tower Media) → Enter "Tiến độ thi công" → Click "Quay lại" → Verify saved in database
- [ ] Edit existing project with data → Navigate steps → Verify no data loss
- [ ] Create new project → Fill all steps → Save → Verify all data saved

## Files Modified

1. `src/modules/project/dto/index.ts`
   - Added `constructionProgress?: string;` to `ProjectTower` class

2. `apps/web/src/components/project/project-form.tsx`
   - Added `buildOverviewStepPayload()` function
   - Updated `getStepPayload()` to use `buildOverviewStepPayload()` for step 0
   - Added `handlePrevStep()` function
   - Updated "Quay lại" button for project wizard to call `handlePrevStep()`
   - Added `handleTowerPrevStep()` function
   - Updated "Quay lại" button in tower dialog to call `handleTowerPrevStep()`
