import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";
import * as api from "../../src/api.js";
import {
  AuthUser,
  StaffTicketDetail as StaffTicketDetailType,
  StaffMember,
  PublicCommentItem,
  InternalNoteItem,
} from "../../src/api.js";

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
  { id: 7, name: "Admin Boss", email: "admin.boss@toktickit.local", role: "ADMINISTRATOR" },
];

const mockTicket: StaffTicketDetailType = {
  id: 10,
  ticketNumber: "TKT-2026-000010",
  summary: "VPN connection drops constantly",
  description: "Whenever connected to the campus VPN, the connection terminates after 10 minutes.",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  status: "NEW",
  requesterIndicatedResolved: true,
  createdAt: "2026-09-12T10:00:00.000Z",
  updatedAt: "2026-09-12T10:00:00.000Z",
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 4, name: "VPN Gateway" },
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local" },
  owner: null,
  attachments: [
    {
      id: 1,
      ticketId: 10,
      originalFilename: "vpn_logs.txt",
      fileSize: 2048,
      mimeType: "text/plain",
      isRemoved: false,
      createdAt: "2026-09-12T10:00:00.000Z",
    },
  ],
};

const mockComments: PublicCommentItem[] = [
  {
    id: 1,
    ticketId: 10,
    content: "We are inspecting the gateway firewall logs.",
    author: { id: 5, name: "Staff Alex", role: "IT_STAFF" },
    createdAt: "2026-09-12T11:00:00.000Z",
  },
];

const mockInternalNotes: InternalNoteItem[] = [
  {
    id: 1,
    ticketId: 10,
    content: "Firewall NAT table overflow observed on cluster 2.",
    author: { id: 5, name: "Staff Alex", role: "IT_STAFF" },
    createdAt: "2026-09-12T11:05:00.000Z",
  },
];

describe("Work Item 6: StaffTicketDetail Component (UI-04)", () => {
  beforeEach(() => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(mockTicket);
    vi.spyOn(api, "getStaffMembers").mockResolvedValue(mockStaffMembers);
    vi.spyOn(api, "getPublicComments").mockResolvedValue(mockComments);
    vi.spyOn(api, "getInternalNotes").mockResolvedValue(mockInternalNotes);
    vi.spyOn(api, "updateTicketOwner").mockResolvedValue({
      id: 10,
      ownerId: 5,
      owner: { id: 5, name: "Staff Alex" },
    });
    vi.spyOn(api, "updateTicketPriority").mockResolvedValue({ id: 10, itPriority: "HIGH" });
    vi.spyOn(api, "updateTicketStatus").mockResolvedValue({ id: 10, status: "IN_PROGRESS" });
    vi.spyOn(api, "createPublicComment").mockResolvedValue({
      id: 2,
      ticketId: 10,
      content: "Public comment added",
      author: { id: 5, name: "Staff Alex", role: "IT_STAFF" },
      createdAt: "2026-09-12T12:00:00.000Z",
    });
    vi.spyOn(api, "createInternalNote").mockResolvedValue({
      id: 2,
      ticketId: 10,
      content: "Confidential internal note added",
      author: { id: 5, name: "Staff Alex", role: "IT_STAFF" },
      createdAt: "2026-09-12T12:05:00.000Z",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders grouped ticket header, requester info, and attachments", async () => {
    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={10} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000010")).toBeInTheDocument();
    });

    expect(screen.getByText("VPN connection drops constantly")).toBeInTheDocument();
    expect(screen.getByText(/Whenever connected to the campus VPN/i)).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("jennifer.anderson@toktickit.local")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("VPN Gateway")).toBeInTheDocument();
    expect(screen.getByText(/vpn_logs\.txt/i)).toBeInTheDocument();
  });

  it("renders requester resolution indicator when flag is true", async () => {
    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={10} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Requester has indicated that this problem appears resolved/i)
      ).toBeInTheDocument();
    });
  });

  it("renders claim ticket button for unassigned ticket and handles claiming", async () => {
    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={10} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /claim ticket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /claim ticket/i }));

    await waitFor(() => {
      expect(api.updateTicketOwner).toHaveBeenCalledWith(10, 5);
      expect(screen.getByText(/Ticket assigned to you/i)).toBeInTheDocument();
    });
  });

  it("renders permitted status transition options for NEW status (OPEN, IN_PROGRESS, CANCELLED)", async () => {
    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={10} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/select next status/i)).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/select next status/i) as HTMLSelectElement;
    const optionValues = Array.from(statusSelect.options).map((opt) => opt.value);

    expect(optionValues).toContain("OPEN");
    expect(optionValues).toContain("IN_PROGRESS");
    expect(optionValues).toContain("CANCELLED");
    expect(optionValues).not.toContain("CLOSED");
  });

  it("renders Public Comments and Internal Notes with distinct headers and confidentiality badge", async () => {
    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={10} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/💬 Public Comments/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/🔒 Internal Notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidential — Staff Only/i)).toBeInTheDocument();
    expect(screen.getByText("We are inspecting the gateway firewall logs.")).toBeInTheDocument();
    expect(
      screen.getByText("Firewall NAT table overflow observed on cluster 2.")
    ).toBeInTheDocument();
  });

  it("allows submitting a public comment", async () => {
    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={10} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/write a public comment for the requester/i)
      ).toBeInTheDocument();
    });

    const commentInput = screen.getByPlaceholderText(
      /write a public comment for the requester/i
    );
    fireEvent.change(commentInput, { target: { value: "Public comment added" } });

    const submitBtn = screen.getByRole("button", { name: /post comment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createPublicComment).toHaveBeenCalledWith(10, "Public comment added");
      expect(screen.getByText("Public comment added")).toBeInTheDocument();
    });
  });

  it("allows submitting an internal note", async () => {
    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={10} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/record confidential diagnosis/i)
      ).toBeInTheDocument();
    });

    const noteInput = screen.getByPlaceholderText(/record confidential diagnosis/i);
    fireEvent.change(noteInput, { target: { value: "Confidential internal note added" } });

    const submitBtn = screen.getByRole("button", { name: /add internal note/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createInternalNote).toHaveBeenCalledWith(
        10,
        "Confidential internal note added"
      );
      expect(screen.getByText("Confidential internal note added")).toBeInTheDocument();
    });
  });

  it("navigates back to ticket queue when Back button is clicked", async () => {
    const onBack = vi.fn();
    render(<StaffTicketDetail authUser={mockStaffUser} ticketId={10} onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back to ticket queue/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /back to ticket queue/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
