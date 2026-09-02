import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { TicketDetail } from "../../src/components/TicketDetail.js";
import * as api from "../../src/api.js";

const mockRequester: api.DevRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.local",
  department: "Human Resources",
  isActive: true,
};

function buildTicket(overrides: Partial<api.Ticket> = {}): api.Ticket {
  return {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    summary: "Cannot access VPN network from home",
    description: "Getting timeout error when connecting.",
    requestedPriority: "HIGH",
    status: "NEW",
    requesterId: 1,
    categoryId: 4,
    relatedSystemId: 4,
    createdAt: new Date("2026-08-29T12:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-08-29T12:00:00.000Z").toISOString(),
    category: { id: 4, name: "Network" },
    relatedSystem: { id: 4, name: "VPN" },
    requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local" },
    attachments: [],
    ...overrides,
  };
}

describe("TicketDetail Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders read-only ticket header fields", async () => {
    vi.spyOn(api, "getTicketById").mockResolvedValue(buildTicket());

    render(<TicketDetail requester={mockRequester} ticketId={101} onBack={vi.fn()} />);

    expect(await screen.findByText("TKT-2026-000101")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Network")).toBeInTheDocument();
    expect(screen.getByDisplayValue("VPN")).toBeInTheDocument();
    expect(screen.getByDisplayValue("NEW")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cannot access VPN network from home")).toBeInTheDocument();
  });

  it("calls onBack when clicking the back link", async () => {
    vi.spyOn(api, "getTicketById").mockResolvedValue(buildTicket());
    const onBack = vi.fn();

    render(<TicketDetail requester={mockRequester} ticketId={101} onBack={onBack} />);

    await screen.findByText("TKT-2026-000101");
    fireEvent.click(screen.getByRole("button", { name: /Back to My Tickets/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows an ownership-rejection error when the ticket is not found (AC-03/BR-06)", async () => {
    const error: any = new Error("Ticket not found.");
    error.status = 404;
    vi.spyOn(api, "getTicketById").mockRejectedValue(error);

    render(<TicketDetail requester={mockRequester} ticketId={999} onBack={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/not found|not owned/i);
  });

  it("shows active and removed attachments in separate tables", async () => {
    vi.spyOn(api, "getTicketById").mockResolvedValue(
      buildTicket({
        attachments: [
          {
            id: 1,
            ticketId: 101,
            originalFilename: "screenshot.png",
            fileSize: 2048,
            mimeType: "image/png",
            isRemoved: false,
            removedAt: null,
            removalReason: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            ticketId: 101,
            originalFilename: "old-log.pdf",
            fileSize: 4096,
            mimeType: "application/pdf",
            isRemoved: true,
            removedAt: new Date().toISOString(),
            removalReason: "Uploaded the wrong file by mistake",
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );

    render(<TicketDetail requester={mockRequester} ticketId={101} onBack={vi.fn()} />);

    // The desktop table and mobile card list both render in jsdom (CSS
    // media queries that toggle d-none/d-md-block don't apply here), so
    // scope assertions to each table by its accessible name.
    const activeTable = await screen.findByRole("table", { name: "Active attachments" });
    expect(within(activeTable).getByText(/screenshot.png/)).toBeInTheDocument();
    expect(within(activeTable).getByRole("button", { name: "Download" })).toBeInTheDocument();

    const removedTable = screen.getByRole("table", { name: "Removed attachments" });
    expect(within(removedTable).getByText(/old-log.pdf/)).toBeInTheDocument();
    expect(within(removedTable).getByText("Uploaded the wrong file by mistake")).toBeInTheDocument();
    expect(within(removedTable).getByRole("button", { name: "Unavailable" })).toBeDisabled();
  });

  it("UI-05 (AC-10/BR-08): requires a reason of at least 5 characters before confirming removal", async () => {
    vi.spyOn(api, "getTicketById").mockResolvedValue(
      buildTicket({
        attachments: [
          {
            id: 1,
            ticketId: 101,
            originalFilename: "screenshot.png",
            fileSize: 2048,
            mimeType: "image/png",
            isRemoved: false,
            removedAt: null,
            removalReason: null,
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );
    const removeSpy = vi.spyOn(api, "removeAttachment").mockResolvedValue({
      id: 1,
      ticketId: 101,
      originalFilename: "screenshot.png",
      fileSize: 2048,
      mimeType: "image/png",
      isRemoved: true,
      removedAt: new Date().toISOString(),
      removalReason: "Wrong file uploaded by mistake",
      createdAt: new Date().toISOString(),
    });

    render(<TicketDetail requester={mockRequester} ticketId={101} onBack={vi.fn()} />);

    const activeTable = await screen.findByRole("table", { name: "Active attachments" });
    fireEvent.click(within(activeTable).getByRole("button", { name: "Remove" }));

    expect(
      screen.getByText("Are you sure you want to remove this attachment?")
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "Confirm Removal" });
    fireEvent.click(confirmButton);

    expect(await screen.findByText(/at least 5 characters/i)).toBeInTheDocument();
    expect(removeSpy).not.toHaveBeenCalled();

    fireEvent.change(
      screen.getByLabelText(/Please provide a reason for removal/i),
      { target: { value: "Wrong file uploaded by mistake" } }
    );
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(101, 1, "Wrong file uploaded by mistake", 1);
    });
  });

  it("hides the upload dropzone once 5 active attachments exist", async () => {
    const attachments = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      ticketId: 101,
      originalFilename: `file-${i + 1}.pdf`,
      fileSize: 1024,
      mimeType: "application/pdf",
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      createdAt: new Date().toISOString(),
    }));
    vi.spyOn(api, "getTicketById").mockResolvedValue(buildTicket({ attachments }));

    render(<TicketDetail requester={mockRequester} ticketId={101} onBack={vi.fn()} />);

    const activeTable = await screen.findByRole("table", { name: "Active attachments" });
    expect(within(activeTable).getByText(/file-1.pdf/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/\+ Upload Attachment/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Maximum of 5 active attachments reached/i)).toBeInTheDocument();
  });
});
