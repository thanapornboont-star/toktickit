import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import * as api from "../../src/api.js";
import { AuthUser, StaffDashboardData } from "../../src/api.js";

const mockStaffUser: AuthUser = {
  id: 5,
  email: "staff.alex@toktickit.local",
  name: "Staff Alex",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockDashboardData: StaffDashboardData = {
  metrics: {
    new: 3,
    open: 4,
    inProgress: 5,
    waitingForRequester: 2,
    resolved: 8,
    myAssigned: 6,
    unassigned: 3,
    recentlyUpdated: 7,
    priorityCounts: {
      high: 4,
      medium: 5,
      low: 1,
    },
  },
  recentTickets: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Cannot connect to VPN from home",
      status: "OPEN",
      itPriority: "HIGH",
      owner: { id: 5, name: "Staff Alex" },
      updatedAt: "2026-10-10T14:30:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000102",
      summary: "New monitor request",
      status: "NEW",
      itPriority: "LOW",
      owner: null,
      updatedAt: "2026-10-10T15:00:00.000Z",
    },
  ],
};

const mockEmptyDashboardData: StaffDashboardData = {
  metrics: {
    new: 0,
    open: 0,
    inProgress: 0,
    waitingForRequester: 0,
    resolved: 0,
    myAssigned: 0,
    unassigned: 0,
    recentlyUpdated: 0,
    priorityCounts: {
      high: 0,
      medium: 0,
      low: 0,
    },
  },
  recentTickets: [],
};

describe("Work Item 7: IT Staff Dashboard Component Tests (UI-04)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // UI-04a: Renders authoritative metric cards with accurate counts
  it("UI-04a: Renders authoritative metric cards with accurate counts (AC-10, BR-15)", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockDashboardData);

    render(<StaffDashboard authUser={mockStaffUser} />);

    // Verify loading state first
    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Welcome back, Staff Alex!")).toBeInTheDocument();
    });

    // Check metric counts
    expect(screen.getByTestId("metric-card-new")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-card-open")).toHaveTextContent("4");
    expect(screen.getByTestId("metric-card-inprogress")).toHaveTextContent("5");
    expect(screen.getByTestId("metric-card-waiting")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-card-myassigned")).toHaveTextContent("6");
    expect(screen.getByTestId("metric-unassigned")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-resolved")).toHaveTextContent("8");
    expect(screen.getByTestId("metric-recent-updated")).toHaveTextContent("7");

    // Check priority counts
    expect(screen.getByTestId("priority-high-stat")).toHaveTextContent("4");
    expect(screen.getByTestId("priority-medium-stat")).toHaveTextContent("5");
    expect(screen.getByTestId("priority-low-stat")).toHaveTextContent("1");
  });

  // UI-04b: Renders recent tickets list and triggers onViewTicket navigation
  it("UI-04b: Renders recent tickets table and handles ticket drill-down navigation (AC-10, AC-12)", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockDashboardData);
    const onViewTicket = vi.fn();

    render(<StaffDashboard authUser={mockStaffUser} onViewTicket={onViewTicket} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    expect(screen.getByText("Cannot connect to VPN from home")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
    expect(screen.getByText("New monitor request")).toBeInTheDocument();

    // Click View button on ticket #101
    const viewBtn = screen.getByTestId("view-ticket-btn-101");
    fireEvent.click(viewBtn);

    expect(onViewTicket).toHaveBeenCalledWith(101);
  });

  // UI-04c: Handles manual refresh button click and authoritative re-fetch
  it("UI-04c: Refetches dashboard data upon clicking the Refresh button", async () => {
    const fetchSpy = vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockDashboardData);

    render(<StaffDashboard authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByText("Welcome back, Staff Alex!")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // UI-04d: Clicking a metric card or queue button triggers onNavigateQueue
  it("UI-04d: Navigates to queue with filters when clicking metric cards or Go to Queue button", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockDashboardData);
    const onNavigateQueue = vi.fn();

    render(<StaffDashboard authUser={mockStaffUser} onNavigateQueue={onNavigateQueue} />);

    await waitFor(() => {
      expect(screen.getByText("Welcome back, Staff Alex!")).toBeInTheDocument();
    });

    // Click Go to Ticket Queue header button
    fireEvent.click(screen.getByTestId("nav-queue-btn"));
    expect(onNavigateQueue).toHaveBeenCalledTimes(1);

    // Click New metric card
    fireEvent.click(screen.getByTestId("metric-card-new"));
    expect(onNavigateQueue).toHaveBeenCalledWith({ status: "NEW" });

    // Click High Priority stat
    fireEvent.click(screen.getByTestId("priority-high-stat"));
    expect(onNavigateQueue).toHaveBeenCalledWith({ itPriority: "HIGH" });
  });

  // UI-04e: Handles empty states (zero tickets) gracefully
  it("UI-04e: Renders empty queue notification when no recent tickets exist (AC-11)", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockEmptyDashboardData);

    render(<StaffDashboard authUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-recent-tickets")).toBeInTheDocument();
    });

    expect(screen.getByText(/No recent tickets in queue/i)).toBeInTheDocument();
    expect(screen.getByTestId("metric-card-new")).toHaveTextContent("0");
  });
});
