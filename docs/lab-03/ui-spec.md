# Lab 3 Zen Green UI Specification — TokTickIT

## 1. Design System & Zen Green Tokens

TokTickIT maintains the cohesive, professional **Zen Green** visual language established in Lab 2, extended to support role badges, IT Staff operational workflows, and distinct visual treatments for public vs. internal communications.

### 1.1 Color Tokens
| Token Name | Hex Code | Purpose / Usage |
|---|---|---|
| `zen-primary` | `#006B3C` | App header, primary action buttons, focused borders, active brand accents |
| `zen-secondary` | `#0B7A46` | Navigation active state, secondary emphasis, hover states |
| `zen-pale` | `#EAF6EF` | Selected item background, public comment background, requester badge |
| `zen-bg` | `#F5F7F6` | Page background (soft off-white) |
| `zen-surface` | `#FFFFFF` | Card surfaces, modal panels, dropdown sheets |
| `zen-text-main` | `#1A2E26` | Primary typography color (deep forest charcoal) |
| `zen-text-muted` | `#5C7168` | Secondary typography, timestamps, helper labels |
| `zen-border` | `#D1DCD6` | Subtle dividers, container borders, card frames |
| `zen-field-readonly`| `#EAEFEA` | System-generated and read-only inputs |
| `zen-error` | `#B3261E` | Validation errors, destructive action buttons, danger alerts |
| `zen-error-bg` | `#FDF2F2` | Error banner background |
| `zen-warning` | `#B58105` | Warning alerts, Medium priority badge |
| `zen-warning-bg` | `#FEF9EE` | Warning banner background |
| `zen-success` | `#198754` | Success alerts, New status badge, active toggle |
| `zen-note-bg` | `#FFFDF0` | Internal Notes card background (distinct soft warm amber) |
| `zen-note-border` | `#F5E08A` | Internal Notes border frame |
| `zen-note-text` | `#735100` | Internal Notes tag label and header |

### 1.2 Role Badge System
- **Requester Badge**: Pale green background (`#EAF6EF`), dark green text (`#006B3C`).
- **IT Staff Badge**: Light blue-tint background (`#E6F4FA`), deep blue text (`#0366D6`).
- **Administrator Badge**: Purple-tint background (`#F3E8FD`), deep purple text (`#6F42C1`).

### 1.3 Priority & Status Badge System
- **Priority**:
  - `HIGH`: Pale red background (`#FCE8E6`), dark red text (`#C5221F`).
  - `MEDIUM`: Pale orange background (`#FEF3D6`), dark orange text (`#B06000`).
  - `LOW`: Pale green background (`#E6F4EA`), dark green text (`#137333`).
- **Status**:
  - `NEW`: `#EAF6EF` / `#006B3C`
  - `OPEN`: `#E6F4FA` / `#0366D6`
  - `IN_PROGRESS`: `#FEF3D6` / `#B06000`
  - `WAITING_FOR_REQUESTER`: `#F3E8FD` / `#6F42C1`
  - `RESOLVED`: `#E6F4EA` / `#137333`
  - `CLOSED`: `#F1F3F4` / `#5F6368`
  - `REOPENED`: `#FCE8E6` / `#C5221F`
  - `CANCELLED`: `#F8D7DA` / `#842029`

---

## 2. Global Application Shell & Navigation

- **Top Navigation Bar**:
  - Background: `#006B3C` (Zen Primary Green), Text: White.
  - Left: TokTickIT logo and brand title.
  - Center: Role-based navigation links:
    - **Requester**: `My Tickets`, `Create Ticket`
    - **IT Staff**: `Ticket Queue`
    - **Administrator**: `User Management`
    *(Unauthorized navigation links are not rendered in the shell).*
  - Right:
    - User identification display: Full Name and Role Badge.
    - `Logout` button (outline white/pale green), which terminates the active session.

---

## 3. Screen Specifications

### 3.1 Login Screen (`/login`)
- **Structure**: Clean, centered card (`max-width: 420px`) on `#F5F7F6` background.
- **Controls**:
  - Email Address input (`type="email"`, required, auto-focus).
  - Password input (`type="password"`, required) with eye toggle button.
  - Primary "Sign In" button (Zen Primary Green).
- **States & Feedback**:
  - *Initial*: Clean form with empty inputs.
  - *Busy*: Button disabled with spinning loading indicator (`Signing in...`).
  - *Validation*: Red inline text under invalid or empty fields.
  - *Safe Failure Alert*: Red banner stating `Invalid email or password. Please try again.` without disclosing account existence.
  - *Deactivated Account Alert*: Yellow/Red banner stating `Account is deactivated. Please contact an administrator.`

### 3.2 Mandatory Change Password Screen (`/change-password`)
- **Structure**: Centered card (`max-width: 480px`).
- **Header**: `Change Your Password` with subtitle `You must change your password to continue`.
- **Controls**:
  - Current (temporary) Password input.
  - New Password input.
  - Confirm New Password input.
  - Interactive Password Rules checklist:
    - [ ] Be at least 8 characters
    - [ ] Include uppercase and lowercase letters
    - [ ] Include a number and a special character
  - Primary "Continue" button.
- **Access Protection**: Normal application screens are completely unreachable while `mustChangePassword = true`.

### 3.3 Requester Ticket Detail & Public Comments (`/tickets/:id`)
- **Ticket Summary & Details**: Preserves Lab 2 layout displaying metadata, description, and attachments.
- **Problem Appears Resolved Banner**:
  - If `requesterIndicatedResolved = false`: A secondary button `Mark as Problem Appears Resolved` is presented.
  - If `requesterIndicatedResolved = true`: A subtle green banner indicates `You indicated that this problem appears resolved. IT Staff will verify and formally resolve the ticket.`
- **Public Comments Thread**:
  - Header: `Public Comments` with count badge.
  - Add Comment form: Textarea with character counter (0 / 2,000) and `Post Comment` button.
  - Timeline cards: Each comment displays author name, role badge, timestamp, and trimmed message content. Background `#EAF6EF` for user's own comments.
- **Security Check**: Internal Notes are strictly excluded from the Requester view.

### 3.4 IT Staff Ticket Queue (`/staff/queue`)
- **Header & Filter Toolbar**:
  - Keyword Search: Text input searching Ticket Number and Summary.
  - Category Filter: Dropdown of active categories.
  - Status Filter: Dropdown of all 8 ticket statuses.
  - IT Priority Filter: Dropdown (`Low`, `Medium`, `High`).
  - Ownership Filter: Dropdown (`All Tickets`, `Assigned to Me`, `Unassigned`).
  - Reset Filters button.
- **Results Count**: `Showing X to Y of Z tickets`.
- **Desktop Table (`>=992px`)**:
  - Columns: `Ticket No.`, `Created Date`, `Summary`, `Category`, `Req Priority`, `IT Priority`, `Status`, `Owner`, `Actions`.
  - Rows: Status and priority badges, clickable `View` button.
- **Mobile / Tablet Representation (`<992px`)**:
  - Transforms into responsive cards stack avoiding horizontal table overflow.
  - Each card shows Ticket Number, Summary, Status badge, Priority badge, Category, Owner, and a full-width `Open Ticket` button.
- **Pagination**:
  - Page navigation controls (`< Previous`, page pills `1, 2, 3...`, `Next >`).
- **States**:
  - *Loading*: Skeleton rows.
  - *Empty*: *"No tickets currently in queue"*.
  - *No Results*: *"No tickets match your search criteria"*.

### 3.5 IT Staff Ticket Detail (`/staff/tickets/:id`)
- **Top Bar**: `Back to Queue` button, Ticket Number, Created timestamp.
- **Operational Control Panel**:
  - **Ticket Owner**: Dropdown of active staff members with `Claim Ticket` quick action.
  - **IT Priority**: Select control (`Low`, `Medium`, `High`).
  - **Current Status**: Select control containing only valid next statuses according to the status transition matrix.
  - Update action button with saving spinner.
- **Read-Only Information Panel**:
  - Requester information (Name, Email).
  - Category and Related System.
  - Original Requested Priority.
  - Summary and Description.
  - Resolution Indication Alert (shows highlighted warning if `requesterIndicatedResolved = true`).
- **Attachments Section**:
  - Active attachments list with download action.
  - Removed attachments history with soft-removal reasons.
- **Two-Column / Divided Communications Section**:
  - **Public Comments**:
    - Pale green background (`#EAF6EF`).
    - Clear label: `Public Comments (Visible to Requester)`.
    - Comment submission textarea and button.
  - **Internal Notes**:
    - Distinct warm amber background (`#FFFDF0`), gold border (`#F5E08A`), lock icon.
    - Clear label: `Internal Notes (Private — IT Staff & Administrators Only)`.
    - Note submission textarea and button.

### 3.6 Administrator User Management (`/admin/users`)
- **Header**: `User Management` with `+ Create User` primary button.
- **Search & Filter Bar**:
  - Keyword search input (matches name or email).
  - Role filter dropdown (`All Roles`, `Requester`, `IT Staff`, `Administrator`).
- **User Directory Table**:
  - Columns: `Full Name`, `Email Address`, `Role` (Badge), `Status` (`Active` / `Inactive`), `Actions` (`Edit`).
- **Create User Modal**:
  - Inputs: Full Name, Email Address, Role selector, Active toggle (default `Yes`), Initial Password input.
  - Notice: *"User will be forced to change this password upon first login."*
  - Buttons: `Save User` (Zen Primary), `Cancel`.
- **Edit User Modal**:
  - Inputs: Full Name, Email Address, Role selector, Active toggle.
  - Danger Zone: `Deactivate User` button (disabled for self-deactivation with warning).
  - Reset Password Action: Button to set new temporary password.
  - Buttons: `Update User`, `Cancel`.

---

## 4. Responsive Viewport Specifications

- **Desktop (`>=992px`)**:
  - Standard max-width container (`1200px`).
  - Multi-column forms and comprehensive queue data tables.
  - Side-by-side or well-spaced operational panes.
- **Tablet (`768px - 991px`)**:
  - Fluid margins (`16px`).
  - Filter toolbar wraps onto two balanced rows.
  - Tables scroll gracefully or convert compact columns.
- **Mobile (`<768px`)**:
  - Full-width stacked layout (`100%`).
  - Queue tables transform into individual card items to prevent mega-grid horizontal overflow.
  - Modals adapt to full-screen drawers.
  - Touch-friendly action buttons (minimum 44x44px touch targets).

---

## 5. Visual QA & Accessibility Checklist

| Screen / Element | Viewport | Verification Item | Status |
|---|---|---|---|
| Shell & Navigation | Desktop / Mobile | Role navigation matches permissions; Logout present | Planned |
| Login Screen | Desktop / Mobile | Zen Green card, accessible labels, safe error banner | Planned |
| Change Password | Desktop / Mobile | Requirement checklist updates, URL access blocked | Planned |
| Requester Ticket Detail | Desktop / Mobile | Public comments render; internal notes absent; resolved indication works | Planned |
| Staff Ticket Queue | Desktop | Multi-column table, filter bar, sorting, pagination | Planned |
| Staff Ticket Queue | Mobile | Responsive card stack, no horizontal overflow | Planned |
| Staff Ticket Detail | Desktop / Mobile | Operational controls (Owner, Priority, Status) work; Public vs Internal visually distinct | Planned |
| Administrator Users | Desktop / Mobile | User list, Create/Edit modals, self-deactivation blocked | Planned |
