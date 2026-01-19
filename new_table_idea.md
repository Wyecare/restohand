# Command Center - Table Management System

## Core Views

### 1. Live Floor View (Main)
- Draggable canvas with table objects
- Real-time color coding by status:
  - Green: Available
  - Yellow: Occupied <1hr
  - Orange: Occupied 1-2hrs
  - Red: Occupied >2hrs
  - Blue: Reserved (upcoming)
  - Grey: Cleaning needed
- Click table → slide-out panel with details
- Hover shows: table number, occupancy time, current bill amount

### 2. Timeline View (Toggle)
- Horizontal gantt chart per table
- X-axis: time blocks (30min intervals)
- Colored bars show occupancy periods
- Click to extend/edit reservation
- Shows gaps for walk-ins
- Current time indicator line

### 3. List View (Toggle)
- Traditional table list
- Sortable by: status, occupancy time, revenue, server
- Filters: by section, by status, by server
- Quick actions: mark occupied, mark available, assign server

## Table Details Panel (Slide-out)

**When clicking any table:**
- Table number and section
- Current status with timer
- Assigned server dropdown
- Current order items and bill amount
- Customer count input
- Notes/special requests text area
- Action buttons:
  - Mark Available
  - Start Cleaning
  - Take Order (link to POS)
  - Reserve

## Floor Plan Editor

**Setup mode (one-time per restaurant):**
- Upload floor plan image as background
- Drag table icons onto canvas
- Resize tables (2-seater, 4-seater, 6-seater icons)
- Add sections/zones with boundary lines
- Label sections (Indoor, Outdoor, Bar, VIP)
- Save configuration

**Elements:**
- Table shapes: circle, square, rectangle
- Add walls/dividers as lines
- Add labels for areas
- Grid snap for alignment

## Smart Filters & Search

**Filter bar always visible:**
- Status filters (checkboxes for available/occupied/reserved)
- Section dropdown
- Server dropdown
- Party size input (shows suitable tables)
- Time range picker (for reservations)

**Search:**
- Search by table number
- Search by customer name (if reservation)

## Quick Actions Toolbar

**Top bar buttons:**
- Refresh status
- View toggle (Floor/Timeline/List)
- Filter panel toggle
- Add reservation
- Print floor status
- Full screen mode

## Table Status Workflows

**Mark as Occupied:**
1. Click table
2. Enter party size
3. Assign server
4. Auto-starts timer
5. Status → Yellow

**Mark as Available:**
1. Click table
2. Confirm action
3. Resets timer
4. Status → Green

**Request Cleaning:**
1. Click table
2. Mark cleaning needed
3. Status → Grey
4. Notification to cleaning staff

**Take Reservation:**
1. Click table or "Add Reservation" button
2. Enter: customer name, phone, party size, date/time
3. Table status → Blue at that time slot
4. Shows in timeline view

## Server Zone Management

**Section assignment:**
- Create sections in floor editor
- Assign servers to sections
- Color-code sections by server
- Toggle overlay: "Show Server Zones"

**Visual:**
- Each section gets a border color
- Server name label in section
- Click section → reassign server

## Revenue Tracking

**Per table:**
- Running bill total shown on hover
- Click for itemized view
- Day total per table in timeline view

**Dashboard metrics:**
- Total occupied tables / total tables
- Average occupancy time
- Revenue by section
- Revenue by server
- Busiest tables of the day

## Mobile Responsiveness

**For servers on tablets/phones:**
- Simplified floor view (smaller, zoomable)
- "My Tables" filter (shows only assigned)
- Quick status updates (swipe actions)
- Large touch targets for table selection

## Data Storage Requirements

**Tables collection:**
- table_id, table_number, section, capacity
- x_position, y_position (canvas coordinates)
- shape, size

**Table_status collection:**
- table_id, status, occupied_since, party_size
- assigned_server, current_bill, notes

**Reservations collection:**
- reservation_id, table_id, customer_name, phone
- party_size, date, time, special_requests

**Sections collection:**
- section_id, name, color, assigned_server

## Tech Stack Recommendations

- Canvas: Konva.js or Fabric.js (drag/drop tables)
- Timeline: react-gantt-chart or custom with CSS grid
- State: Redux/Zustand for real-time updates
- Real-time: Socket.io for multi-user updates
- Backend: REST API for CRUD operations

## Phase 1 (MVP - Build This First)

- Floor view with draggable tables
- Basic status colors (3 states: available, occupied, reserved)
- Click table → simple modal with status toggle
- Manual status updates
- Static floor layout (pre-configured)

## Phase 2 (After MVP)

- Timeline view
- Reservation system
- Server assignment
- Floor plan editor
- Revenue tracking

## Phase 3 (Polish)

- List view
- Advanced filters
- Mobile optimization
- Multi-floor support
- Analytics dashboard