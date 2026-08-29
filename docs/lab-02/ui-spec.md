# Lab 2 Zen Green UI Specification - TokTickIT

## 1. Design Philosophy & Zen Green Token System

The TokTickIT interface adheres to the **Zen Green** design language, delivering a clean, modern, and accessible experience for IT Service Desk operations.

### 1.1 Color Tokens
| Token Name | Hex Code | Purpose / Usage |
|---|---|---|
| `zen-primary` | `#006B3C` | App header, primary action buttons, focused borders, active brand accents |
| `zen-secondary` | `#0B7A46` | Active navigation tabs, secondary emphasis, hover states, interactive links |
| `zen-pale` | `#EAF6EF` | Selected item background, subtle container backgrounds, light badges |
| `zen-bg` | `#F5F7F6` | Page background (quiet off-white) |
| `zen-surface` | `#FFFFFF` | Card surfaces, modals, dropdown panels |
| `zen-text-main` | `#1A2E26` | Primary typography color (dark charcoal-green, high contrast) |
| `zen-text-muted` | `#5C7168` | Secondary typography, captions, helper text |
| `zen-border` | `#D1DCD6` | Container borders, dividers, subtle outlines |
| `zen-field-readonly` | `#EAEFEA` | Read-only and system-generated input fields |
| `zen-error` | `#B3261E` | Validation errors, destructive actions, danger alerts |
| `zen-error-bg` | `#FDF2F2` | Error banner background |
| `zen-warning` | `#B58105` | Warning alerts, Medium priority badge |
| `zen-warning-bg` | `#FEF9EE` | Warning banner background |
| `zen-success` | `#198754` | Success banner, Low priority badge, New status badge |

### 1.2 Typography & Spacing
- **Font Family**: System font stack (`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`)
- **Scale**:
  - H1 / Page Header: `1.75rem (28px)`, font-weight: `700`
  - H2 / Section Title: `1.25rem (20px)`, font-weight: `600`
  - Body Text: `1rem (16px)`, font-weight: `400`
  - Small / Helper / Table Text: `0.875rem (14px)`, font-weight: `400`
- **Spacing Grid**: 4px base (`4px, 8px, 12px, 16px, 24px, 32px`)

---

## 2. Global Application Shell & Navigation

- **Header Bar**:
  - Background: `#006B3C` (Zen Primary Green), Text: White.
  - Left: TokTickIT Brand logo and title.
  - Center/Nav: Links to **My Tickets** and **Create Ticket** with active underline indicator.
  - Right: Current Development Requester badge showing requester name & avatar circle, plus a visible **"Change Requester"** button.
- **Testing Disclaimer**: Persistent subtle notice or tooltip indicating that the user selector is for testing purposes and not real authentication.

---

## 3. Screen Specifications

### 3.1 Development Requester Selection Screen
- **URL / Route**: `/` or `/select-requester` (modal or full-screen view if unselected)
- **Components**:
  - Centered Zen Card on `#F5F7F6` background.
  - Banner: *"Development Requester Selection — Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen."*
  - Dropdown: Lists active requesters with Name and Department.
  - Action Buttons: `Continue` (Zen Primary Button) disabled if none selected.
  - States:
    - *Loading*: Skeleton loader or spinner while fetching requesters.
    - *Empty*: *"No active development requesters found"* with retry button.
    - *API Failure*: Safe error alert with *"Retry"* action.

### 3.2 Create Ticket Screen (Create Mode)
- **URL / Route**: `/create-ticket`
- **Form Layout**:
  - **Requester (Read-only)**: Auto-populated with the currently selected requester's name. Styled with `zen-field-readonly` background.
  - **Ticket Date (Read-only)**: Current date/time display.
  - **Category (Required)**: Dropdown loaded from `/api/categories`. Red asterisk `*`.
  - **Related System (Required)**: Dropdown loaded from `/api/related-systems`. Red asterisk `*`.
  - **Requested Priority (Required)**: Radio button group or segmented button: `LOW` (Green outline), `MEDIUM` (Amber outline), `HIGH` (Red outline). Default: `MEDIUM`.
  - **Ticket Summary (Required)**: Text input, 5–100 characters. Real-time counter and validation message directly below field.
  - **Description (Required)**: Multi-line textarea (min 4 rows), 10–2000 characters.
  - **Attachments (Optional)**: File input / dropzone accepting JPG, PNG, WEBP, PDF (max 5 MB). List selected files before submit.
  - **Form Actions**:
    - `Submit Ticket` button: Zen Primary Green. Shows loading spinner and disables when busy.
    - `Cancel` button: Secondary neutral outline.
- **Feedback States**:
  - *Validation Failure*: Field-level inline messages in dark red (`#B3261E`) below invalid inputs. Form values preserved.
  - *Submission Success*: Success alert highlighting official generated Ticket Number (e.g. `TKT-2026-000001`), with buttons *"View in My Tickets"* and *"Create Another Ticket"*.
  - *API Error*: Preserves all user-entered form data and displays an error banner at top.

### 3.3 My Tickets Screen
- **URL / Route**: `/my-tickets`
- **Components**:
  - **Controls Header**:
    - Keyword Search box (placeholder: *"Search by ticket number or summary..."*).
    - Filters: Category dropdown, Priority dropdown, Status dropdown.
    - `Clear Filters` button.
    - `+ Create Ticket` primary button.
  - **Ticket Table (Desktop >= 992px)**:
    - Columns: `Ticket No.` | `Created Date` | `Summary` | `Category` | `Requested Priority` | `Current Status` | `Attachments` | `Action`
    - Sorting indicators on `Created Date`, `Ticket No.`, and `Priority`.
    - Clicking a row or "View" button navigates to Ticket Detail.
  - **Ticket Cards (Mobile < 768px)**:
    - Stacked card layout with Ticket Number, Priority badge, Category, Summary, Date, and View link.
  - **Pagination Controls**:
    - Page size selector (`8`, `20`, `50`).
    - Showing *"1 to 8 of 24 tickets"*, Previous, page number pills, Next.
  - **States**:
    - *Loading*: Table skeleton or spinner.
    - *Empty*: *"You haven't created any IT tickets yet. Click '+ Create Ticket' to get started."*
    - *No Results*: *"No tickets match your search or filter criteria."* with a *"Clear all filters"* action.

### 3.4 Ticket Detail Screen (View Mode & Attachments)
- **URL / Route**: `/tickets/:id`
- **Layout**:
  - **Back Button**: `← Back to My Tickets`
  - **Ticket Header Card**:
    - All ticket fields presented as clean, read-only key-value pairs (Ticket No, Date, Requester, Category, System, Priority, Status `NEW`).
    - Summary and Description displayed with full text wrap.
    - Strictly **no** IT Staff controls, comments, internal notes, or status transitions.
  - **Attachments Section**:
    - Active Attachments Table: Filename, File Size, Upload Date, `Download` button, `Remove` button.
    - Soft-Removed Attachments Table: Filename, File Size, Removal Timestamp, Removal Reason badge, with Download disabled.
    - `+ Upload Attachment` Dropzone: Only shown if active attachments count < 5.
  - **Soft Removal Confirmation Modal**:
    - Triggered by clicking "Remove".
    - Displays prompt: *"Are you sure you want to remove this attachment?"*
    - Textarea: *"Please provide a reason for removal (required, min 5 chars):"*
    - Buttons: `Confirm Removal` (Destructive Red) and `Cancel`.

---

## 4. Responsive Viewport Specifications

| Viewport | Width | Layout Rules |
|---|---|---|
| **Desktop** | `>= 992px` | Full multi-column grid, table view for tickets, centered main container with max-width `1200px`. |
| **Tablet** | `768px – 991px` | Two-column form layout, collapsible table with horizontal scroll or wrapped summary, touch-friendly padding. |
| **Mobile** | `< 768px` | Single-column vertically stacked fields, cards instead of wide table, full-width primary buttons, zero horizontal overflow. |

---

## 5. Accessibility & Interaction Rules

- All form controls must have explicit `<label>` tags with `htmlFor` bindings.
- Required fields must display an accessible asterisk and have `aria-required="true"`.
- Focus states must display a visible outline using `zen-secondary` (`#0B7A46`).
- Color is never used as the sole indicator of status or error; always accompany with text or icons.
- Buttons and links are navigable via `Tab` and activatable via `Enter`/`Space`.
