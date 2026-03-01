# ChoirMate - Member Year Tracking & No Practice Status

## Overview
This document explains how ChoirMate handles different member sets across years and the new "No Practice" status.

## New Feature: "No Practice" Status

### What is "No Practice"?
The "No Practice" status is used to mark dates when there was no choir practice scheduled. This helps distinguish between:
- **Absent**: Member was expected but didn't attend
- **No Practice**: No practice was scheduled that day

### How it Works
1. **Visual Indicator**: 🚫 Blue icon with blue background
2. **Statistics**: Records marked as "No Practice" are **excluded** from attendance calculations
3. **Usage**: Click on any attendance cell and select "No Practice" from the dropdown menu

### Statuses That Don't Affect Attendance %:
- ❌ **No Practice** - No choir practice scheduled
- ⏸ **Break from Choir** - Member on temporary break
- — **Not Joined Yet** - Member hadn't joined choir at that time
- 👋 **Left Choir** - Member has permanently left

### Statuses That Affect Attendance %:
- ✓ **Present** - Member attended (counts as present)
- ✗ **Absent** - Member didn't attend (counts as absent)
- 🏥 **Medical Leave** - Member absent due to medical reasons (counts as absent)

## Member Year Tracking

### Current System
Members have a `joined_date` field that tracks when they joined the choir. This is already stored in the database.

### How to Handle Different Member Sets for Different Years

#### Option 1: Using the Joined Date Field (Recommended)
When you add a new member:
1. Go to the **Members** page
2. Click **"Add New Member"**
3. Fill in their details
4. Set the **"Joined Date"** to when they actually joined (e.g., "2026-01-01" for new 2026 members)

The system will automatically use "Not Joined Yet" status for dates before their join date.

#### Option 2: Manual Status Management
For existing members who were part of the 2025 choir but not continuing in 2026:
1. Go to the **Attendance** page
2. Find the member's row
3. For 2026 dates, mark them as **"Left Choir"**

For new 2026 members:
1. Add them through the **Members** page with a 2026 join date
2. Their 2025 attendance will automatically show "Not Joined Yet"

### Example Scenarios

#### Scenario 1: Member from 2025 continuing to 2026
- **Action**: No changes needed
- **Result**: They appear in both years' attendance

#### Scenario 2: Member who left after 2025
- **Action**: Mark them as "Left Choir" for all 2026 dates
- **Result**: 
  - 2025 attendance: Shows their actual attendance
  - 2026 attendance: Shows "Left Choir" (excluded from stats)

#### Scenario 3: New member joining in 2026
- **Action**: Add member with joined_date = "2026-01-01"
- **Result**:
  - 2025 attendance: Shows "Not Joined Yet" (excluded from stats)
  - 2026 attendance: Can mark as Present/Absent/etc.

## Best Practices

### For Year-End Transition (2025 → 2026)
1. **Review Current Members**
   - Identify who is continuing vs. leaving
   - Mark leaving members as "Left Choir" for future dates

2. **Add New Members**
   - Add new 2026 joiners through the Members page
   - Set their join date to their actual start date

3. **Handle No-Practice Days**
   - For holidays or days when practice was cancelled
   - Mark all members as "No Practice" for that date
   - This keeps accurate records without affecting attendance %

### For Bulk Updates
If you need to mark multiple members as "Left Choir" or "No Practice" for a specific date:
1. Switch to **Year View** on the Attendance page
2. Navigate to the date
3. Click each member's cell and update the status

## Attendance Statistics Accuracy

### What's Included in Stats
- Present ✓
- Absent ✗
- Medical Leave 🏥

### What's Excluded from Stats
- No Practice 🚫
- Break from Choir ⏸
- Not Joined Yet —
- Left Choir 👋

### Example Calculation
```
Member A in January 2026:
- Week 1: Present ✓
- Week 2: Absent ✗
- Week 3: No Practice 🚫 (excluded)
- Week 4: Present ✓

Attendance % = 2 present / 2 total = 100%
(Week 3 not counted because it was "No Practice")
```

## Technical Implementation

### Database
- Members table has `joined_date` column
- Attendance table has `status` column with all status types

### Frontend (React)
- `STATUS_CONFIG` object defines all statuses with colors and icons
- `getMemberStats()` function excludes non-relevant statuses from calculations

### Backend (Node.js)
- Dashboard API calculates quarterly rankings
- Custom date range API allows flexible reporting
- Both exclude non-relevant statuses from percentage calculations

## Questions or Issues?

If you need to:
- Import historical data for a specific year
- Bulk update member statuses
- Generate reports for specific time periods

Refer to the dashboard's "Custom Date Range" selector for attendance rankings, or contact your administrator for bulk import scripts.
