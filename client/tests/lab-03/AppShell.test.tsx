import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ApplicationShell } from "../../src/App.js";
import * as api from "../../src/api.js";
import type { AuthUser } from "../../src/api.js";

// Stub heavy child components so the shell renders quickly
vi.mock("../../src/components/MyTickets.js", () => ({
  MyTickets: () => <div data-testid="my-tickets-view">MyTickets</div>,
}));
vi.mock("../../src/components/CreateTicket.js", () => ({
  CreateTicket: () => <div data-testid="create-ticket-view">CreateTicket</div>,
}));
vi.mock("../../src/components/StaffTicketQueue.js", () => ({
  StaffTicketQueue: () => <div data-testid="staff-queue-view">StaffTicketQueue</div>,
}));
vi.mock("../../src/components/StaffTicketDetail.js", () => ({
  StaffTicketDetail: () => <div data-testid="staff-detail-view">StaffTicketDetail</div>,
}));
vi.mock("../../src/components/UserManagement.js", () => ({
  UserManagement: () => <div data-testid="user-management-view">UserManagement</div>,
}));

const requesterUser: AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.local",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

const staffUser: AuthUser = {
  id: 2,
  name: "Alex Staff",
  email: "staff.alex@toktickit.local",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const adminUser: AuthUser = {
  id: 3,
  name: "Admin Boss",
  email: "admin.boss@toktickit.local",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
};

describe("ApplicationShell — Role Navigation & Zen Green Visual QA (Work Item 8 — UI-06)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Requester Navigation ────────────────────────────────────────────────
  it("renders My Tickets and Create Ticket nav links for REQUESTER, not Ticket Queue or User Management", () => {
    render(<ApplicationShell authUser={requesterUser} />);

    expect(screen.getByRole("link", { name: /My Tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create Ticket/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ticket Queue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /User Management/i })).not.toBeInTheDocument();
  });

  it("defaults REQUESTER to My Tickets view and shows role badge", () => {
    render(<ApplicationShell authUser={requesterUser} />);

    expect(screen.getByTestId("my-tickets-view")).toBeInTheDocument();
    expect(screen.getByText(/Requester/i)).toBeInTheDocument();
  });

  // ── IT Staff Navigation ─────────────────────────────────────────────────
  it("renders only Ticket Queue nav link for IT_STAFF and defaults to staff queue view", () => {
    render(<ApplicationShell authUser={staffUser} />);

    expect(screen.getByRole("link", { name: /Ticket Queue/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /My Tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Create Ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /User Management/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("staff-queue-view")).toBeInTheDocument();
  });

  it("shows IT Staff role badge in header", () => {
    render(<ApplicationShell authUser={staffUser} />);
    expect(screen.getByText(/IT Staff/i)).toBeInTheDocument();
  });

  // ── Administrator Navigation ────────────────────────────────────────────
  it("renders only User Management nav link for ADMINISTRATOR and defaults to user-management view", () => {
    render(<ApplicationShell authUser={adminUser} />);

    expect(screen.getByRole("link", { name: /User Management/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /My Tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Create Ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ticket Queue/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("user-management-view")).toBeInTheDocument();
  });

  it("shows Administrator role badge in header", () => {
    render(<ApplicationShell authUser={adminUser} />);
    expect(screen.getByText(/Administrator/i)).toBeInTheDocument();
  });

  // ── Sign Out ────────────────────────────────────────────────────────────
  it("renders Sign Out button and calls onLogout callback when clicked", async () => {
    const onLogout = vi.fn();
    vi.spyOn(api, "logout").mockResolvedValue(undefined as any);

    render(<ApplicationShell authUser={requesterUser} onLogout={onLogout} />);

    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    expect(signOutBtn).toBeInTheDocument();

    fireEvent.click(signOutBtn);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  // ── Requester in-shell navigation ───────────────────────────────────────
  it("REQUESTER can navigate to Create Ticket view by clicking nav link", () => {
    render(<ApplicationShell authUser={requesterUser} />);

    fireEvent.click(screen.getByRole("link", { name: /Create Ticket/i }));

    // Create Ticket view should mount
    expect(screen.getByTestId("create-ticket-view")).toBeInTheDocument();
  });

  // ── Zen Green visual tokens ─────────────────────────────────────────────
  it("header element carries app-header class for Zen Green styling", () => {
    const { container } = render(<ApplicationShell authUser={requesterUser} />);

    const header = container.querySelector("header.app-header");
    expect(header).not.toBeNull();
  });

  it("brand link renders TokTickIT brand text", () => {
    render(<ApplicationShell authUser={requesterUser} />);
    expect(screen.getByRole("link", { name: /TokTickIT/i })).toBeInTheDocument();
  });
});
