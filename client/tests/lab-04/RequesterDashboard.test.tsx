import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import * as api from "../../src/api.js";
import { AuthUser, RequesterDashboardData } from "../../src/api.js";

const mockRequesterUser: AuthUser = {
  id: 1,
  email: "jennifer.anderson@toktickit.local",
  name: "Jennifer Anderson",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

const mockDashboardData: RequesterDashboardData = {
  metrics: {
    totalOpen: 3,
    inProgress: 2,
    waitingForRequester: 1,
    recentlyResolved: 4,
    closed: 5,
  },
  recentTickets: [
    {
      id: 50,
      ticketNumber: "TKT-2026-000050",
      summary: "Outlook fails to sync calendar",
      status: "IN_PROGRESS",
      updatedAt: "2026-10-10T12:00:00.000Z",
    },
    {
      id: 51,
      ticketNumber: "TKT-2026-000051",
      summary: "Keyboard spacebar stuck",
      status: "WAITING_FOR_REQUESTER",
      updatedAt: "2026-10-10T13:30:00.000Z",
    },
  ],
};

const mockEmptyDashboardData: RequesterDashboardData = {
  metrics: {
    totalOpen: 0,
    inProgress: 0,
    waitingForRequester: 0,
    recentlyResolved: 0,
    closed: 0,
  },
  recentTickets: [],
};

describe("Work Item 7: Requester Dashboard Component Tests (UI-05)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // UI-05a: Renders authoritative metric cards with accurate user counts
  it("UI-05a: Renders authoritative metric cards with accurate user counts (AC-09, BR-14)", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard authUser={mockRequesterUser} />);

    // Check loading indicator first
    expect(screen.getByTestId("requester-dashboard-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Welcome, Jennifer Anderson!")).toBeInTheDocument();
    });

    // Check metric values
    expect(screen.getByTestId("metric-card-total-open")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-card-waiting")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-card-resolved")).toHaveTextContent("4");
  });

  // UI-05b: Renders recent tickets and handles onViewTicket drill-down
  it("UI-05b: Renders recent tickets list and handles ticket detail drill-down (AC-09, AC-12)", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockDashboardData);
    const onViewTicket = vi.fn();

    render(<RequesterDashboard authUser={mockRequesterUser} onViewTicket={onViewTicket} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000050")).toBeInTheDocument();
    });

    expect(screen.getByText("Outlook fails to sync calendar")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000051")).toBeInTheDocument();
    expect(screen.getByText("Keyboard spacebar stuck")).toBeInTheDocument();

    const viewBtn = screen.getByTestId("requester-view-ticket-btn-50");
    fireEvent.click(viewBtn);

    expect(onViewTicket).toHaveBeenCalledWith(50);
  });

  // UI-05c: Empty state prompt when user has no tickets
  it("UI-05c: Displays empty state prompt and allows creating first ticket (AC-11)", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockEmptyDashboardData);
    const onCreateTicket = vi.fn();

    render(<RequesterDashboard authUser={mockRequesterUser} onCreateTicket={onCreateTicket} />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-requester-tickets")).toBeInTheDocument();
    });

    expect(screen.getByText(/You haven't submitted any tickets yet/i)).toBeInTheDocument();

    const firstTicketBtn = screen.getByTestId("empty-state-create-ticket-btn");
    expect(firstTicketBtn).toBeInTheDocument();

    fireEvent.click(firstTicketBtn);
    expect(onCreateTicket).toHaveBeenCalledTimes(1);
  });

  // UI-05d: Manual refresh button re-fetches dashboard metrics
  it("UI-05d: Manually refetches requester metrics on clicking Refresh button", async () => {
    const fetchSpy = vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard authUser={mockRequesterUser} />);

    await waitFor(() => {
      expect(screen.getByText("Welcome, Jennifer Anderson!")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const refreshBtn = screen.getByTestId("refresh-requester-dashboard-btn");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // UI-05e: Quick action navigation to My Tickets
  it("UI-05e: Handles quick action navigation to My Tickets view", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockDashboardData);
    const onNavigateMyTickets = vi.fn();

    render(<RequesterDashboard authUser={mockRequesterUser} onNavigateMyTickets={onNavigateMyTickets} />);

    await waitFor(() => {
      expect(screen.getByText("Welcome, Jennifer Anderson!")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("view-all-my-tickets-btn"));
    expect(onNavigateMyTickets).toHaveBeenCalledTimes(1);

    // Clicking Total Open metric card also navigates
    fireEvent.click(screen.getByTestId("metric-card-total-open"));
    expect(onNavigateMyTickets).toHaveBeenCalledTimes(2);
  });
});
