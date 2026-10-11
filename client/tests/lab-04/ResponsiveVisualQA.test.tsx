import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationShell } from "../../src/App.js";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import * as api from "../../src/api.js";
import type { AuthUser, StaffDashboardData, RequesterDashboardData } from "../../src/api.js";

const mockStaffUser: AuthUser = {
  id: 2,
  name: "Alex Staff",
  email: "staff.alex@toktickit.local",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockRequesterUser: AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.local",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

const mockStaffData: StaffDashboardData = {
  metrics: {
    new: 2,
    open: 3,
    inProgress: 1,
    waitingForRequester: 0,
    resolved: 5,
    myAssigned: 4,
    unassigned: 2,
    recentlyUpdated: 3,
    priorityCounts: { high: 1, medium: 2, low: 0 },
  },
  recentTickets: [
    {
      id: 10,
      ticketNumber: "TKT-2026-000010",
      summary: "Network switch offline",
      status: "OPEN",
      itPriority: "HIGH",
      owner: { id: 2, name: "Alex Staff" },
      updatedAt: "2026-10-10T10:00:00.000Z",
    },
  ],
};

const mockRequesterData: RequesterDashboardData = {
  metrics: {
    totalOpen: 1,
    inProgress: 1,
    waitingForRequester: 0,
    recentlyResolved: 2,
    closed: 3,
  },
  recentTickets: [
    {
      id: 20,
      ticketNumber: "TKT-2026-000020",
      summary: "Monitor flickering",
      status: "IN_PROGRESS",
      updatedAt: "2026-10-10T11:00:00.000Z",
    },
  ],
};

describe("Work Item 8: Zen Green Visual Polish, Responsive Layouts & Accessibility (AC-12)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(mockStaffData);
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(mockRequesterData);
  });

  // 1. Accessibility & ARIA roles
  it("A11Y-01: Header, main navigation, and dashboards provide proper ARIA attributes", async () => {
    const { container } = render(<ApplicationShell authUser={mockStaffUser} />);

    // Navigation must have proper label
    expect(screen.getByRole("navigation", { name: /Main navigation/i })).toBeInTheDocument();

    // App header element carries Zen Green class
    const header = container.querySelector("header.app-header");
    expect(header).toBeInTheDocument();
  });

  // 2. Multi-viewport and responsive container structure
  it("RESP-01: StaffDashboard renders responsive container and table-responsive wrappers", async () => {
    const { container } = render(<StaffDashboard authUser={mockStaffUser} />);

    const dashboardContainer = container.querySelector(".container-fluid");
    expect(dashboardContainer).toBeInTheDocument();

    // Table must be wrapped in table-responsive to prevent horizontal overflow on mobile
    await screen.findByText("TKT-2026-000010");
    const tableWrapper = container.querySelector(".table-responsive");
    expect(tableWrapper).toBeInTheDocument();
  });

  // 3. Interactive Touch Targets & Buttons
  it("TOUCH-01: Interactive buttons have accessible roles and identifiable labels", async () => {
    render(<StaffDashboard authUser={mockStaffUser} />);

    const refreshBtn = await screen.findByRole("button", { name: /Refresh dashboard/i });
    expect(refreshBtn).toBeInTheDocument();
    expect(refreshBtn).toHaveAttribute("aria-label", "Refresh dashboard");
  });

  // 4. Requester Dashboard Responsive & Empty State Accessibility
  it("A11Y-02: RequesterDashboard renders accessible headings, metric cards, and responsive tables", async () => {
    const { container } = render(<RequesterDashboard authUser={mockRequesterUser} />);

    // Heading hierarchy
    const mainHeading = await screen.findByRole("heading", { level: 1 });
    expect(mainHeading).toHaveTextContent("Welcome, Jennifer Anderson!");

    // Table responsiveness
    const tableWrapper = container.querySelector(".table-responsive");
    expect(tableWrapper).toBeInTheDocument();
  });

  // 5. Metric Cards Keyboard Accessibility
  it("KEYBOARD-01: Metric cards carry tabIndex for keyboard focus navigation", async () => {
    render(<StaffDashboard authUser={mockStaffUser} />);

    const newMetricCard = await screen.findByTestId("metric-card-new");
    expect(newMetricCard).toHaveAttribute("tabIndex", "0");
    expect(newMetricCard).toHaveAttribute("role", "button");
  });
});
