import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";
import * as api from "../../src/api.js";
import { AuthUser, StaffTicketDetail as StaffTicketDetailType, StaffMember } from "../../src/api.js";

const mockStaffUser: AuthUser = {
  id: 5,
  email: "staff.alex@toktickit.local",
  name: "Staff Alex",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockStaffMembers: StaffMember[] = [
  { id: 5, name: "Staff Alex", email: "staff.alex@toktickit.local", role: "IT_STAFF" },
  { id: 6, name: "Staff Emily", email: "staff.emily@toktickit.local", role: "IT_STAFF" },
];

const mockNewTicket: StaffTicketDetailType = {
  id: 20,
  ticketNumber: "TKT-2026-000020",
  summary: "Database connection timeouts",
  description: "Web app experiences sporadic 504 timeouts connecting to postgres.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  status: "NEW",
  requesterIndicatedResolved: false,
  createdAt: "2026-09-29T10:00:00.000Z",
  updatedAt: "2026-09-29T10:00:00.000Z",
  category: { id: 1, name: "Database" },
  relatedSystem: { id: 1, name: "PostgreSQL Cluster" },
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local" },
  owner: null,
  attachments: [],
};

const mockOpenTicketWithAdvisory: StaffTicketDetailType = {
  id: 21,
  ticketNumber: "TKT-2026-000021",
  summary: "Printer toner low",
  description: "Floor 2 printer reports toner low cartridge yellow.",
  requestedPriority: "LOW",
  itPriority: "LOW",
  status: "OPEN",
  requesterIndicatedResolved: true, // Advisory indicator active!
  createdAt: "2026-09-29T10:00:00.000Z",
  updatedAt: "2026-09-29T10:30:00.000Z",
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 2, name: "Office Printer" },
  requester: { id: 2, name: "David Lee", email: "david.lee@toktickit.local" },
  owner: { id: 5, name: "Staff Alex" },
  attachments: [],
};

describe("Work Item 6: Ticket Workflow & Resolution Component Tests (UI-03)", () => {
  beforeEach(() => {
    vi.spyOn(api, "getStaffMembers").mockResolvedValue(mockStaffMembers);
    vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
    vi.spyOn(api, "getInternalNotes").mockResolvedValue([]);
    vi.spyOn(api, "getActionsTaken").mockResolvedValue({ actions: [], totalCount: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // UI-03a: Permitted Transitions Matrix Enforcement (BR-09, AC-05, AC-06)
  it("UI-03a: Only permitted next statuses are listed in dropdown (NEW -> OPEN, IN_PROGRESS, CANCELLED)", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(mockNewTicket);

    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={20} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Database connection timeouts")).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Select next status/i) as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map((o) => o.value);

    // Permitted from NEW: OPEN, IN_PROGRESS, CANCELLED
    expect(options).toContain("OPEN");
    expect(options).toContain("IN_PROGRESS");
    expect(options).toContain("CANCELLED");

    // Prohibited transitions: RESOLVED, CLOSED, WAITING_FOR_REQUESTER must NOT be present
    expect(options).not.toContain("RESOLVED");
    expect(options).not.toContain("CLOSED");
    expect(options).not.toContain("WAITING_FOR_REQUESTER");
  });

  // UI-03b: Advisory Resolution Banner & Formal Resolution (BR-10, AC-07)
  it("UI-03b: Renders advisory resolution banner when requesterIndicatedResolved is true and allows formal resolution", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(mockOpenTicketWithAdvisory);
    const updateStatusSpy = vi.spyOn(api, "updateTicketStatus").mockResolvedValue({
      id: 21,
      status: "RESOLVED",
    });

    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={21} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("advisory-resolution-banner")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Requester Feedback: The requester has indicated that this problem appears resolved/i)
    ).toBeInTheDocument();

    const resolveBtn = screen.getByTestId("formally-resolve-btn");
    expect(resolveBtn).toBeInTheDocument();
    expect(resolveBtn).toHaveTextContent("Formally Resolve Ticket");

    // Click Formally Resolve Ticket
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(updateStatusSpy).toHaveBeenCalledWith(21, "RESOLVED", "2026-09-29T10:30:00.000Z");
      expect(screen.getByText(/Ticket formally resolved successfully/i)).toBeInTheDocument();
    });
  });

  // UI-03c: Concurrency Conflict Handling (BR-12, AC-08)
  it("UI-03c: Displays conflict warning alert when updateTicketStatus returns 409 Conflict", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(mockOpenTicketWithAdvisory);
    const conflictError: any = new Error("Ticket has been updated by another user. Please refresh and retry.");
    conflictError.status = 409;
    conflictError.code = "CONFLICT";

    vi.spyOn(api, "updateTicketStatus").mockRejectedValue(conflictError);

    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={21} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("formally-resolve-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("formally-resolve-btn"));

    await waitFor(() => {
      expect(
        screen.getByText(/Ticket has been updated by another user. Please refresh and retry/i)
      ).toBeInTheDocument();
    });
  });
});
