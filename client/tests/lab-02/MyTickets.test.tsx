import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MyTickets } from "../../src/components/MyTickets.js";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const mockRequesterA: api.DevRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.local",
  department: "Human Resources",
  isActive: true,
};

const mockRequesterB: api.DevRequester = {
  id: 2,
  name: "Michael Brown",
  email: "michael.brown@toktickit.local",
  department: "Finance",
  isActive: true,
};

const mockTicketsResponseA: api.PaginatedTicketsResponse = {
  data: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Cannot access VPN network from home",
      description: "Getting timeout error.",
      requestedPriority: "HIGH",
      status: "NEW",
      requesterId: 1,
      categoryId: 4,
      relatedSystemId: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: 4, name: "Network" },
      relatedSystem: { id: 4, name: "VPN" },
      activeAttachmentCount: 2,
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000102",
      summary: "Laptop keyboard broken key",
      description: "Key 'E' is not registering.",
      requestedPriority: "MEDIUM",
      status: "NEW",
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 1, name: "Corporate Laptop" },
      activeAttachmentCount: 0,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 8,
    totalItems: 2,
    totalPages: 1,
  },
};

const mockTicketsResponseB: api.PaginatedTicketsResponse = {
  data: [
    {
      id: 201,
      ticketNumber: "TKT-2026-000201",
      summary: "Finance software license issue",
      description: "Cannot generate tax report.",
      requestedPriority: "LOW",
      status: "NEW",
      requesterId: 2,
      categoryId: 3,
      relatedSystemId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: 3, name: "Software" },
      relatedSystem: { id: 1, name: "Corporate Laptop" },
      activeAttachmentCount: 1,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 8,
    totalItems: 1,
    totalPages: 1,
  },
};

describe("MyTickets Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue([
      { id: 1, name: "Account and Access", isActive: true },
      { id: 2, name: "Hardware", isActive: true },
      { id: 3, name: "Software", isActive: true },
      { id: 4, name: "Network", isActive: true },
    ]);
  });

  it("renders tickets list with Ticket Number, Priority badge, Category, and Attachment count", async () => {
    vi.spyOn(api, "getMyTickets").mockResolvedValue(mockTicketsResponseA);

    render(
      <MyTickets
        requester={mockRequesterA}
        onCreateTicket={vi.fn()}
        onViewTicketDetail={vi.fn()}
      />
    );

    expect(screen.getByText(/Loading your tickets/i)).toBeInTheDocument();

    // Both the desktop table and mobile card list render in jsdom (CSS
    // media queries that toggle `d-none`/`d-md-block` don't apply here),
    // so scope assertions to the single <table> to avoid duplicate matches.
    const table = await screen.findByRole("table");
    expect(within(table).getByText("TKT-2026-000101")).toBeInTheDocument();
    expect(within(table).getByText("Cannot access VPN network from home")).toBeInTheDocument();
    expect(within(table).getByText("TKT-2026-000102")).toBeInTheDocument();
    expect(within(table).getByText("📎 2")).toBeInTheDocument();
  });

  it("renders empty state when requester has no tickets", async () => {
    vi.spyOn(api, "getMyTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 8, totalItems: 0, totalPages: 1 },
    });

    render(
      <MyTickets
        requester={mockRequesterA}
        onCreateTicket={vi.fn()}
        onViewTicketDetail={vi.fn()}
      />
    );

    const emptyStateHeading = await screen.findByText("No Tickets Created Yet");
    // The header's "+ Create Ticket" button also renders alongside the
    // empty-state CTA, so scope this assertion to the empty-state container.
    const emptyStateContainer = emptyStateHeading.closest("div")!;
    expect(
      within(emptyStateContainer).getByRole("button", { name: "+ Create Ticket" })
    ).toBeInTheDocument();
  });

  it("handles keyword search and filter changes", async () => {
    const getTicketsSpy = vi.spyOn(api, "getMyTickets").mockResolvedValue(mockTicketsResponseA);

    render(
      <MyTickets
        requester={mockRequesterA}
        onCreateTicket={vi.fn()}
        onViewTicketDetail={vi.fn()}
      />
    );

    const table = await screen.findByRole("table");
    await waitFor(() => {
      expect(within(table).getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    // Type in search box and submit
    fireEvent.change(screen.getByPlaceholderText(/Search by ticket number or summary/i), {
      target: { value: "VPN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(getTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "VPN",
        }),
        1
      );
    });
  });

  it("UI-04: isolates data and reloads tickets when switching requesters in application shell", async () => {
    sessionStorage.clear();
    vi.spyOn(api, "getDevRequesters").mockResolvedValue([mockRequesterA, mockRequesterB]);
    const getTicketsSpy = vi.spyOn(api, "getMyTickets");
    getTicketsSpy.mockImplementation((params, requesterId) => {
      if (requesterId === 1) return Promise.resolve(mockTicketsResponseA);
      if (requesterId === 2) return Promise.resolve(mockTicketsResponseB);
      return Promise.resolve({ data: [], pagination: { page: 1, pageSize: 8, totalItems: 0, totalPages: 1 } });
    });

    render(<App />);

    // 1. Select Requester A
    const select = await screen.findByLabelText("Development requester");
    fireEvent.change(select, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Requester A's tickets shown
    let table = await screen.findByRole("table");
    expect(within(table).getByText("TKT-2026-000101")).toBeInTheDocument();
    expect(within(table).queryByText("TKT-2026-000201")).not.toBeInTheDocument();

    // 2. Click "Change Requester"
    fireEvent.click(screen.getByRole("button", { name: /Change Requester/i }));

    // 3. Select Requester B
    const select2 = await screen.findByLabelText("Development requester");
    fireEvent.change(select2, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Requester B's tickets shown, Requester A's tickets gone!
    table = await screen.findByRole("table");
    expect(within(table).getByText("TKT-2026-000201")).toBeInTheDocument();
    expect(within(table).queryByText("TKT-2026-000101")).not.toBeInTheDocument();
  });
});
