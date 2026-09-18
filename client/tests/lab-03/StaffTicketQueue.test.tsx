import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StaffTicketQueue } from "../../src/components/StaffTicketQueue.js";
import * as api from "../../src/api.js";
import { AuthUser, StaffTicketSummary } from "../../src/api.js";

const mockStaffUser: AuthUser = {
  id: 5,
  email: "staff.alex@toktickit.local",
  name: "Staff Alex",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockTickets: StaffTicketSummary[] = [
  {
    id: 10,
    ticketNumber: "TKT-2026-000010",
    summary: "VPN connection drops every 10 minutes",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    status: "NEW",
    requesterIndicatedResolved: false,
    createdAt: "2026-09-13T10:00:00.000Z",
    updatedAt: "2026-09-13T10:30:00.000Z",
    category: { id: 4, name: "Network" },
    requester: { id: 1, name: "Jennifer Anderson" },
    owner: null,
  },
  {
    id: 11,
    ticketNumber: "TKT-2026-000011",
    summary: "Email client cannot send attachments",
    requestedPriority: "MEDIUM",
    itPriority: "LOW",
    status: "IN_PROGRESS",
    requesterIndicatedResolved: true,
    createdAt: "2026-09-12T09:00:00.000Z",
    updatedAt: "2026-09-12T14:00:00.000Z",
    category: { id: 2, name: "Software" },
    requester: { id: 2, name: "Michael Brown" },
    owner: { id: 5, name: "Staff Alex" },
  },
];

const mockPagination = {
  page: 1,
  pageSize: 10,
  totalTickets: 2,
  totalPages: 1,
};

describe("Work Item 5: StaffTicketQueue Component (UI-03)", () => {
  beforeEach(() => {
    vi.spyOn(api, "getStaffTickets").mockResolvedValue({
      tickets: mockTickets,
      pagination: mockPagination,
    });
    vi.spyOn(api, "getCategories").mockResolvedValue([
      { id: 2, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders search input and filter dropdowns", async () => {
    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search ticket number or summary/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by it priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by assignment/i)).toBeInTheDocument();
  });

  it("renders ticket rows with Ticket Number, Summary, Category, and badges", async () => {
    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000010").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("VPN connection drops every 10 minutes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Email client cannot send attachments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Network").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Software").length).toBeGreaterThan(0);
  });

  it("renders status badges for each ticket", async () => {
    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getAllByText("New").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
  });

  it("renders priority badges for IT Priority", async () => {
    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      const highBadges = screen.getAllByText("HIGH");
      expect(highBadges.length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("LOW").length).toBeGreaterThan(0);
  });

  it("shows 'Unassigned' for tickets without an owner", async () => {
    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getAllByText(/unassigned/i).length).toBeGreaterThan(0);
    });
  });

  it("shows requester-indicated-resolved badge when flag is true", async () => {
    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getAllByText(/req\. resolved/i).length).toBeGreaterThan(0);
    });
  });

  it("shows ticket count in header", async () => {
    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByText("2 tickets")).toBeInTheDocument();
    });
  });

  it("renders Open buttons for each ticket", async () => {
    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      const openButtons = screen.getAllByRole("button", { name: /open ticket/i });
      expect(openButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("calls onViewTicket with ticket id when Open button is clicked", async () => {
    const onViewTicket = vi.fn();
    render(<StaffTicketQueue authUser={mockStaffUser} onViewTicket={onViewTicket} />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /open ticket/i })).toBeTruthy();
    });

    const openButtons = screen.getAllByRole("button", { name: /open ticket/i });
    fireEvent.click(openButtons[0]);
    expect(onViewTicket).toHaveBeenCalledWith(10);
  });

  it("shows empty state when no tickets match", async () => {
    vi.spyOn(api, "getStaffTickets").mockResolvedValue({
      tickets: [],
      pagination: { page: 1, pageSize: 10, totalTickets: 0, totalPages: 0 },
    });

    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByText(/no tickets match/i)).toBeInTheDocument();
    });
  });

  it("shows error state when API call fails", async () => {
    vi.spyOn(api, "getStaffTickets").mockRejectedValue(new Error("Network failure"));

    render(<StaffTicketQueue authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByText(/network failure/i)).toBeInTheDocument();
    });
  });
});
