# Lab 4 Zen Green UI Specification — TokTickIT

## 1. Design System & Zen Green Tokens

TokTickIT preserves the cohesive, clean **Zen Green** visual language established in Lab 2 and Lab 3, expanding it to support operational metric cards, interactive dashboard drill-downs, and parent-child **Actions Taken** work logs.

### 1.1 Core Palette Tokens
| Token Name | Hex Code | Purpose / Usage |
|---|---|---|
| `zen-primary` | `#006B3C` | App header, primary buttons, active brand accents, focused borders |
| `zen-secondary` | `#0B7A46` | Active navigation tabs, secondary actions, hover states |
| `zen-pale` | `#EAF6EF` | Selected card tint, Requester badges, table hover tint |
| `zen-bg` | `#F5F7F6` | Off-white ambient page background |
| `zen-surface` | `#FFFFFF` | Card surfaces, modal panels, table rows |
| `zen-text-main` | `#1A2E26` | Primary typography (deep forest charcoal) |
| `zen-text-muted` | `#5C7168` | Secondary typography, captions, timestamps, metric labels |
| `zen-border` | `#D1DCD6` | Subtle dividers, card frames, input borders |
| `zen-field-readonly` | `#EAEFEA` | System-assigned and read-only inputs |
| `zen-error` | `#B3261E` | Validation errors, rejected states, conflict alerts |
| `zen-warning` | `#B58105` | Warning alerts, Medium priority badge, advisory indicators |
| `zen-success` | `#198754` | Success alerts, New status badge, completed indicators |

### 1.2 Metric Card Visual Design
- **Card Surface**: Solid white (`#FFFFFF`) with 1px border (`#D1DCD6`) and 8px border radius.
- **Top Accent Line**: 3px top border color-coded by metric category (Green for New/Open, Amber for In Progress, Purple for Waiting, Blue for Assigned).
- **Metric Value**: Bold 32px font (`#1A2E26`), centered or left-aligned with accessible contrast.
- **Metric Label**: 14px font (`#5C7168`) with uppercase tracking.
- **Drill-Down CTA**: "View all" / "Filter queue" link with hover underline and keyboard focus ring.

---

## 2. Role-Based Navigation & Application Shell

### 2.1 Navigation Structure by Role
- **Requester Shell**:
  - `Dashboard` (Primary home)
  - `My Tickets`
  - `Create Ticket`
  - User Profile dropdown (`Profile`, `Logout`)
- **IT Staff Shell**:
  - `Dashboard` (Primary home)
  - `Ticket Queue`
  - `Create Ticket`
  - User Profile dropdown (`Profile`, `Logout`)
- **Administrator Shell**:
  - `Dashboard` (Primary home)
  - `Ticket Queue`
  - `User Management`
  - `Create Ticket`
  - User Profile dropdown (`Profile`, `Logout`)

### 2.2 Active Navigation Indicator
- Active route item features a solid white pill or underline with font-weight 600, distinct from inactive links.
- On smaller viewports, a mobile hamburger menu maintains accessible toggle states without shifting layout.

---

## 3. IT Staff Dashboard Layout & Components

### 3.1 Header & Quick Summary
- Welcome headline: `"Welcome back, {userName}!"` with subtitle `"Here's what's happening in your operational queue."`
- Real-time refresh button with spinning state during authoritative re-fetch.

### 3.2 Operational Metric Cards Grid
- 5 primary operational cards rendered in a responsive grid (5 columns desktop, 3 columns tablet, 1 column mobile):
  1. **New**: Count of unassigned, freshly arrived tickets.
  2. **Open**: Count of acknowledged tickets awaiting progression.
  3. **In Progress**: Count of active tickets under investigation.
  4. **Waiting for Requester**: Count of tickets blocked on requester response.
  5. **My Assigned**: Count of active tickets where current user is owner.
- Secondary Priority Cards:
  - **High Priority Queue**: Urgent tickets requiring immediate attention.

### 3.3 Recent & Urgent Tickets List
- Table on desktop / stacked cards on mobile.
- Columns: Ticket Number, Summary, Status pill, IT Priority, Owner, Last Updated, Actions.
- Clicking any ticket row opens the IT Staff Ticket Detail.

### 3.4 Quick Action Shortcuts
- Floating or side card offering instant links:
  - `Create Ticket`
  - `Search All Tickets`
  - `Go to My Queue`

---

## 4. Requester Dashboard Layout & Components

### 4.1 Header & Personal Summary
- Welcome headline: `"Welcome, {userName}!"` with subtitle `"Here's the latest on your requests."`

### 4.2 Personal Ticket Metric Cards
- 4 cards:
  1. **My Open Tickets**: Total unresolved tickets submitted by user.
  2. **In Progress**: Tickets currently being actively addressed by IT.
  3. **Resolved**: Tickets marked resolved within the last 7 days.
  4. **Closed**: Historical closed tickets.

### 4.3 My Recent Tickets & Action Shortcuts
- Concise list of the Requester's top 5 most recently active tickets.
- Quick action buttons: `Create Ticket`, `View My Tickets`.
- Empty state: When user has no tickets, an inviting illustration and `"Submit your first ticket"` button are displayed.

---

## 5. Actions Taken UI on Ticket Detail

### 5.1 Container & Layout
- Placed on the Ticket Detail screen as a dedicated section titled **"Actions Taken"**.
- Displays total actions count badge e.g. `Actions Taken (3)`.
- Includes "+ Add Action Taken" button (visible strictly to IT Staff and Administrators).

### 5.2 Actions Taken Table / Card Display
- Columns / Fields:
  - **Action Date/Time**: Formatted local date and time string (e.g. `May 12, 09:14 AM`).
  - **Action Description**: Complete text description of work performed.
  - **Result**: Summary of technical outcome.
  - **Performed By**: Auto-performer badge showing technician name and IT Staff badge.
  - **Follow-Up**:
    - If `isFollowUpRequired` is `true`: Amber badge `"Follow-up Required"` with the `followUpNote` displayed in an accented sub-box.
    - If `false`: Light gray badge `"No Follow-up"`.
  - **Attachment Notes**: Text pointer (e.g. `"See switch-log.txt"`) if present.
  - **Actions**: Edit button (IT Staff/Admin).

### 5.3 Add / Edit Action Taken Modal
- **Fields**:
  - `Action Date & Time`: Datetime picker, defaults to current time. Cannot exceed current time by > 5 minutes.
  - `Action Description`: Multiline textarea, required.
  - `Result`: Multiline textarea, required.
  - `Follow-Up Required`: Accessible checkbox toggle.
  - `Follow-Up Note`: Multiline textarea. **Dynamically required and highlighted** when `Follow-Up Required` is checked.
  - `Attachment Notes`: Optional single-line text input.
- **Validation Feedback**: Inline red messages beneath fields upon invalid blur or submit.
- **Performer Note**: Informational notice: `"Action will be recorded under your authenticated account: {userName}"`.

### 5.4 Requester View of Actions Taken
- Clean, read-only list on the Requester Ticket Detail view.
- No Add/Edit buttons or action management controls rendered.
- Full transparency for the user to understand what technical work was performed.

---

## 6. Ticket Workflow & Resolution Feedback

### 6.1 Permitted Transitions Dropdown
- Status transition select box displays only valid destination statuses permitted by `BR-09`.
- Non-permitted options are excluded from the select menu.

### 6.2 Advisory Resolution Banner
- When `requesterIndicatedResolved = true`:
  - An amber banner displays prominently at the top of the IT Staff Ticket Detail:
    > **Requester Feedback**: The requester has indicated that this issue appears resolved. Please review the Actions Taken and formally resolve this ticket.
- IT Staff clicks `"Formally Resolve Ticket"`, opening a confirmation prompt that updates status to `RESOLVED`.

---

## 7. Responsive Viewport Specifications

| Viewport Category | Width Range | Layout Behavior |
|---|---|---|
| **Desktop** | ≥ 992 px | Multi-column dashboard grid (5 metric cards per row), full table layout for Actions Taken and queues. |
| **Tablet** | 768 px – 991 px | 2–3 cards per row, table horizontally scrollable or wrapping secondary columns. |
| **Mobile** | < 768 px | Single-column stacked cards, full-width touch targets (≥44px), mobile card list replacing tables, zero horizontal overflow. |

---

## 8. Accessibility & Quality Checklist

- [ ] **Contrast**: All text meets WCAG AA minimum contrast ratio (4.5:1 for normal text, 3:1 for large text).
- [ ] **Focus Rings**: Distinct 2px Zen Green focus ring (`#006B3C` with outline offset) on all buttons, links, and form inputs.
- [ ] **Touch Targets**: Minimum 44px by 44px clickable areas on all mobile action items.
- [ ] **Non-Color Cues**: Statuses and priorities use distinct icons/text labels in addition to color badges.
- [ ] **Screen Reader Compatibility**: ARIA attributes (`aria-expanded`, `aria-label`, `aria-required`) on modals, accordions, and metric cards.
- [ ] **Clean Layout**: Zero horizontal overflow, clipped text, or overlapping controls across all supported screen sizes.
