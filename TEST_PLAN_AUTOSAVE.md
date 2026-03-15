# Test Plan: Multi-Step Form Auto-Save Fixes

## Overview
Verify that all fixes for multi-step form auto-save work correctly:
1. Project form saves data on step navigation
2. Tower form saves data on step navigation  
3. constructionProgress field is persisted

## Test Environment Requirements
- Backend: Running with updated DTOs
- Frontend: Running with updated project-form.tsx
- Database: MariaDB with project table

## Test Scenarios

### SCENARIO 1: Project Form - Overview Tab (Step 0)

#### Test 1.1: Save on "Tiếp tục"
1. Open existing project in edit mode
2. Go to Step 0 (Tổng quan)
3. Edit "Tổng quan dự án" field (overviewHtml) - enter some text
4. Edit "Mô tả video" field (videoDescription) - enter some text
5. Click "Tiếp tục"
6. **Expected**: Toast shows "Successfully saved" and moves to Step 1
7. **Verify**: Go back to Step 0 → Confirm both fields show the new values (data was saved)

#### Test 1.2: Save on "Quay lại"
1. (Continuing from Test 1.1) At Step 1 (Vị trị)
2. Make some change to step 1 field
3. Click "Quay lại" to go back to Step 0
4. **Expected**: Toast shows "Successfully saved" and moves to Step 0
5. **Verify**: 
   - Go to Step 1 → Confirm changes were saved in database
   - Go back to Step 0 → Confirm previous step 0 data still intact

#### Test 1.3: No Data Loss on Step Navigation
1. Create new project
2. Fill Step 0 (overview) completely
3. Click "Tiếp tục" → Go to Step 1
4. Fill Step 1 (location) completely
5. Click "Tiếp tục" → Go to Step 2
6. Fill Step 2 (subdivisions) completely
7. Click "Tiếp tục" → Go to Step 3
8. Fill Step 3 (progress updates) completely
9. Click "Tiếp tục" → Go to Step 4
10. Fill Step 4 (documents) completely
11. Click "Lưu thay đổi"
12. **Verify**: Load project again → All data from all steps is present

---

### SCENARIO 2: Tower Form - Construction Progress (Step 0)

#### Test 2.1: Save constructionProgress on "Tiếp tục"
1. Open existing project with subdivisions/towers
2. Edit a tower
3. Go to Tower Step 0 (Tổng quan)
4. Edit "Tiến độ thi công" field - enter a value (e.g. "30% Đang đổ móng")
5. Click "Tiếp tục"
6. **Expected**: Tower data saves, moves to Tower Step 1
7. **Verify**: 
   - Check database: subdivisions.towers[].constructionProgress = "30% Đang đổ móng"
   - Edit same tower again → Step 0 shows saved value

#### Test 2.2: Save constructionProgress on "Quay lại"
1. (Continuing from Test 2.1) At Tower Step 1 (Vị trí)
2. Make a change to latitude/longitude
3. Click "Quay lại"
4. **Expected**: Tower Step 1 data saves, goes back to Tower Step 0
5. **Verify**: In Tower Step 1, confirm changes were saved to database

#### Test 2.3: constructionProgress Deleted/Empty
1. Edit a tower with existing constructionProgress
2. Clear the "Tiến độ thi công" field
3. Click "Tiếp tục"
4. **Expected**: Field saves as empty/null/undefined
5. **Verify**: Reload tower → Field is empty

---

### SCENARIO 3: Step Payload Isolation

#### Test 3.1: Step 0 Doesn't Overwrite Other Steps
1. Create project with all steps filled
2. Edit Step 0 only (change overview text)
3. Click "Tiếp tục"
4. Navigate to Step 2 → Verify subdivisions still have all towers with constructionProgress intact
5. Navigate to Step 3 → Verify progressUpdates still intact
6. Navigate to Step 4 → Verify documentItems still intact

#### Test 3.2: Step 2 Doesn't Overwrite Other Steps
1. (Continuing) Edit Step 2 (add/edit a tower)
2. Click "Tiếp tục"
3. Navigate back to Step 0 → Verify overviewHtml still intact
4. Navigate to Step 3 → Verify progressUpdates still intact
5. Navigate to Step 4 → Verify documentItems still intact

---

### SCENARIO 4: Final Save Behavior

#### Test 4.1: Final Save Only Saves Documents on Last Step
1. Create project, fill all steps
2. Go to Step 4 (Tài liệu)
3. Add/edit a document
4. Click "Lưu thay đổi"
5. **Expected**: Only documentItems field is sent to backend
6. **Verify**: Reload project → Document is saved, all other steps data intact

#### Test 4.2: Database Consistency After Full Navigation
1. Create new project
2. Navigate through all steps (Step 0→1→2→3→4), filling data at each step
3. At each "Tiếp tục": verify step data is saved to DB
4. At Step 4 "Lưu thay đổi": verify document items are saved
5. After modal closes, reload project from different user/tab
6. **Expected**: All data from all 5 steps is visible
7. **Verify**: 
   - Step 0: overviewHtml, videoDescription present
   - Step 2: subdivisions with towers and constructionProgress present
   - Step 3: progressUpdates present
   - Step 4: documentItems present

---

### SCENARIO 5: Edge Cases

#### Test 5.1: Navigate Back from Step 1 to Step 0
1. Edit project at Step 1
2. Click "Quay lại"
3. **Expected**: Step 1 data saves before going back
4. **Verify**: Go to Step 1 again → Changes persisted

#### Test 5.2: Multiple Save/Edit Cycles
1. Edit project, make changes at Step 0
2. Click "Tiếp tục" → Step 1
3. Make changes → Click "Quay lại" → Step 0
4. Make more changes → Click "Tiếp tục" → Step 1
5. **Expected**: All changes from both cycles are saved
6. **Verify**: Reload project → All changes present

#### Test 5.3: Validation Still Works
1. Edit project at Tower Step 0
2. Clear required field (Số tầng or Số căn hộ)
3. Click "Tiếp tục" or "Quay lại"
4. **Expected**: Toast error shown, step not saved, state unchanged
5. **Verify**: Validation works and prevents invalid data save

---

## Verification Checklist

### Backend
- [ ] ProjectTower DTO has `constructionProgress?: string;` field
- [ ] UpdateProjectDto validates ProjectTower correctly
- [ ] project.service.update() maps all fields from DTO to database
- [ ] Subdivisions JSON in project table stores constructionProgress correctly

### Frontend
- [ ] No TypeScript errors
- [ ] buildOverviewStepPayload() returns correct fields
- [ ] getStepPayload(0) uses buildOverviewStepPayload()
- [ ] getStepPayload(1-4) returns only step-specific fields
- [ ] handleNextStep() saves before navigating forward
- [ ] handlePrevStep() saves before navigating back
- [ ] handleSubmit() uses getStepPayload(currentStep) when isLastStep
- [ ] saveTowerToSubdivision() calls persistTowerStep()
- [ ] handleTowerPrevStep() saves before navigating back in tower dialog

### Database
- [ ] Project records show updated overviewHtml when saved from Step 0
- [ ] Project records show updated videoDescription when saved from Step 0
- [ ] Subdivisions JSON shows updated constructionProgress in towers array
- [ ] All changes from all steps are present without data loss

---

## Regression Testing

After deploying fixes, verify existing functionality still works:
- [ ] Create new project from scratch (all steps)
- [ ] Edit existing project
- [ ] Delete project
- [ ] View project details
- [ ] List projects works correctly
- [ ] All other project features work

---

## Notes

1. All step data (except Step 4) is auto-saved on step navigation
2. Step 4 (documents) is saved only on final "Lưu thay đổi" click
3. User cannot lose data as long as they stay in the form (unsaved state warning if needed)
4. "Quay lại" and "Tiếp tục" both trigger auto-save of current step
5. constructionProgress is now part of ProjectTower and will be persisted
