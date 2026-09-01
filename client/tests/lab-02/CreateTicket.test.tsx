import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateTicket } from "../../src/components/CreateTicket.js";
import * as api from "../../src/api.js";

const mockRequester: api.DevRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.local",
  department: "Human Resources",
  isActive: true,
};

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access", isActive: true },
  { id: 2, name: "Hardware", isActive: true },
  { id: 3, name: "Software", isActive: true },
  { id: 4, name: "Network", isActive: true },
];

const mockSystems: api.RelatedSystem[] = [
  { id: 1, name: "Corporate Laptop", isActive: true },
  { id: 2, name: "Email", isActive: true },
  { id: 3, name: "Campus Wi-Fi", isActive: true },
  { id: 4, name: "VPN", isActive: true },
];

describe("CreateTicket Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue(mockSystems);
  });

  it("renders read-only requester information and loaded reference categories", async () => {
    render(<CreateTicket requester={mockRequester} onNavigateToMyTickets={vi.fn()} />);

    expect(screen.getByDisplayValue("Jennifer Anderson (Human Resources)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jennifer.anderson@toktickit.local")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Account and Access" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Corporate Laptop" })).toBeInTheDocument();
    });
  });

  it("UI-02: shows inline validation errors when submitting with empty or invalid fields", async () => {
    const createSpy = vi.spyOn(api, "createTicket");
    render(<CreateTicket requester={mockRequester} onNavigateToMyTickets={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Network" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(await screen.findByText(/Ticket summary is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Ticket description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a Category/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a Related System/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("UI-03: successfully creates a ticket and renders the official Ticket Number", async () => {
    const createSpy = vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Cannot connect to campus VPN from home",
      description: "Getting error 800 during VPN negotiation on corporate laptop.",
      requestedPriority: "HIGH",
      status: "NEW",
      requesterId: 1,
      categoryId: 4,
      relatedSystemId: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: 4, name: "Network" },
      relatedSystem: { id: 4, name: "VPN" },
    });

    render(<CreateTicket requester={mockRequester} onNavigateToMyTickets={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Network" })).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
      target: { value: "Cannot connect to campus VPN from home" },
    });
    fireEvent.change(screen.getByLabelText(/Problem Description/i), {
      target: { value: "Getting error 800 during VPN negotiation on corporate laptop." },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "HIGH" }));

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(await screen.findByText("Ticket Created Successfully!")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    expect(createSpy).toHaveBeenCalledWith(
      {
        summary: "Cannot connect to campus VPN from home",
        description: "Getting error 800 during VPN negotiation on corporate laptop.",
        categoryId: 4,
        relatedSystemId: 4,
        requestedPriority: "HIGH",
      },
      1
    );
  });

  it("preserves entered form inputs when API creation fails", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Database connection lost. Please try again."));
    render(<CreateTicket requester={mockRequester} onNavigateToMyTickets={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Network" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
      target: { value: "Preserved Summary Text" },
    });
    fireEvent.change(screen.getByLabelText(/Problem Description/i), {
      target: { value: "Preserved Description Text longer than 10 chars" },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "4" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Database connection lost");
    expect(screen.getByDisplayValue("Preserved Summary Text")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Preserved Description Text longer than 10 chars")).toBeInTheDocument();
  });

  it("validates attachment file type and size on client-side", async () => {
    render(<CreateTicket requester={mockRequester} onNavigateToMyTickets={vi.fn()} />);

    const fileInput = screen.getByLabelText(/Supporting Attachment/i);

    // Invalid file type (.exe)
    const invalidFile = new File(["dummy content"], "malicious.exe", { type: "application/x-msdownload" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(await screen.findByText(/Invalid file type/i)).toBeInTheDocument();
  });
});
