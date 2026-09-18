import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TicketDetail } from "../../src/components/TicketDetail.js";
import { ApplicationShell } from "../../src/App.js";
import * as api from "../../src/api.js";
import { AuthUser, Ticket, PublicCommentItem } from "../../src/api.js";

const mockRequester: AuthUser = {
  id: 1,
  email: "jennifer.anderson@toktickit.local",
  name: "Jennifer Anderson",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

const mockTicket: Ticket = {
  id: 10,
  ticketNumber: "TKT-2026-000010",
  summary: "VPN connection drops constantly",
  description: "Whenever connected to the campus VPN, the connection terminates after 10 minutes.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  status: "NEW",
  requesterIndicatedResolved: false,
  requesterId: 1,
  categoryId: 4,
  relatedSystemId: 4,
  createdAt: "2026-09-12T10:00:00.000Z",
  updatedAt: "2026-09-12T10:00:00.000Z",
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 4, name: "VPN" },
  attachments: [],
};

const mockComments: PublicCommentItem[] = [
  {
    id: 1,
    ticketId: 10,
    content: "We are inspecting the gateway firewall logs.",
    author: {
      id: 5,
      name: "Staff Alex",
      role: "IT_STAFF",
    },
    createdAt: "2026-09-12T10:30:00.000Z",
  },
];

describe("Work Item 4: Requester Continuity & Interactive Capabilities", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Public Comments and allows authenticated requester to submit a new comment", async () => {
    vi.spyOn(api, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(api, "getPublicComments").mockResolvedValue(mockComments);
    const postSpy = vi.spyOn(api, "createPublicComment").mockResolvedValue({
      comment: {
        id: 2,
        ticketId: 10,
        content: "I tested again and it dropped at 10:45 AM.",
        author: {
          id: 1,
          name: "Jennifer Anderson",
          role: "REQUESTER",
        },
        createdAt: "2026-09-12T10:46:00.000Z",
      },
    });

    render(
      <TicketDetail
        requester={mockRequester}
        ticketId={10}
        onBack={() => {}}
      />
    );

    // Verify existing staff comment renders
    expect(await screen.findByText("Public Comments")).toBeInTheDocument();
    expect(screen.getByText("We are inspecting the gateway firewall logs.")).toBeInTheDocument();
    expect(screen.getByText("Staff Alex")).toBeInTheDocument();

    // Type a new comment
    const commentInput = screen.getByLabelText(/Add a Public Comment/i);
    const postButton = screen.getByRole("button", { name: /Post Comment/i });

    expect(postButton).toBeDisabled();
    fireEvent.change(commentInput, { target: { value: "I tested again and it dropped at 10:45 AM." } });
    expect(postButton).toBeEnabled();

    // Submit comment
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(10, "I tested again and it dropped at 10:45 AM.", 1);
    });

    // Verify newly appended comment appears in thread
    expect(await screen.findByText("I tested again and it dropped at 10:45 AM.")).toBeInTheDocument();
  });

  it("renders 'Problem Appears Resolved' action and updates state when clicked (AC-09, BR-16)", async () => {
    vi.spyOn(api, "getTicketById").mockResolvedValue({ ...mockTicket, requesterIndicatedResolved: false });
    vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
    const indicateSpy = vi.spyOn(api, "indicateProblemResolved").mockResolvedValue({
      message: "Indicated problem appears resolved",
      ticket: { id: 10, requesterIndicatedResolved: true },
    });

    render(
      <TicketDetail
        requester={mockRequester}
        ticketId={10}
        onBack={() => {}}
      />
    );

    const resolveBtn = await screen.findByRole("button", { name: /Problem Appears Resolved/i });
    expect(resolveBtn).toBeInTheDocument();

    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(indicateSpy).toHaveBeenCalledWith(10, 1);
    });

    // Verify success banner appears and button is replaced
    expect(await screen.findByText("Problem indicated as resolved.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Problem Appears Resolved/i })).not.toBeInTheDocument();
  });

  it("shows resolved banner directly when ticket is already indicated as resolved", async () => {
    vi.spyOn(api, "getTicketById").mockResolvedValue({ ...mockTicket, requesterIndicatedResolved: true });
    vi.spyOn(api, "getPublicComments").mockResolvedValue([]);

    render(
      <TicketDetail
        requester={mockRequester}
        ticketId={10}
        onBack={() => {}}
      />
    );

    expect(await screen.findByText("Problem indicated as resolved.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Problem Appears Resolved/i })).not.toBeInTheDocument();
  });

  it("renders authenticated application shell with name, role badge, sign out, and no dev selector", () => {
    const logoutMock = vi.fn();
    render(
      <ApplicationShell
        authUser={mockRequester}
        onLogout={logoutMock}
      />
    );

    // Shell displays user name and Requester badge
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("Requester")).toBeInTheDocument();

    // Sign out button is rendered; Change Requester button is NOT rendered
    expect(screen.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Change Requester/i })).not.toBeInTheDocument();

    // Dev disclaimer is hidden
    expect(screen.queryByText(/Development requester mode is a Lab 2 testing mechanism/i)).not.toBeInTheDocument();
  });
});
