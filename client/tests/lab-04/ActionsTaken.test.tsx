import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActionsTakenSection } from "../../src/components/ActionsTakenSection.js";
import * as api from "../../src/api.js";
import { AuthUser, ActionTakenItem } from "../../src/api.js";

const mockStaffUser: AuthUser = {
  id: 5,
  email: "staff.alex@toktickit.local",
  name: "Staff Alex",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockRequesterUser: AuthUser = {
  id: 1,
  email: "jennifer.anderson@toktickit.local",
  name: "Jennifer Anderson",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

const mockActions: ActionTakenItem[] = [
  {
    id: 101,
    ticketId: 10,
    actionDateTime: "2026-09-29T10:15:00.000Z",
    description: "Replaced faulty switch port and tested packet loss.",
    result: "Packet loss reduced to 0%. Interface up at 1Gbps full duplex.",
    performedById: 5,
    performedBy: {
      id: 5,
      name: "Staff Alex",
      role: "IT_STAFF",
    },
    isFollowUpRequired: true,
    followUpNote: "Monitor CRC error counts tomorrow morning at 09:00.",
    attachmentNotes: "See switch-telemetry.log",
    createdAt: "2026-09-29T10:15:00.000Z",
    updatedAt: "2026-09-29T10:15:00.000Z",
  },
  {
    id: 102,
    ticketId: 10,
    actionDateTime: "2026-09-29T11:00:00.000Z",
    description: "Re-seated transceiver module on distribution router.",
    result: "Optics signal level within normal threshold (-3.5 dBm).",
    performedById: 6,
    performedBy: {
      id: 6,
      name: "Staff Emily",
      role: "IT_STAFF",
    },
    isFollowUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    createdAt: "2026-09-29T11:00:00.000Z",
    updatedAt: "2026-09-29T11:00:00.000Z",
  },
];

describe("Work Item 5: Actions Taken Component Tests (UI-01, UI-02)", () => {
  beforeEach(() => {
    vi.spyOn(api, "getActionsTaken").mockResolvedValue({
      actions: mockActions,
      totalCount: mockActions.length,
    });
    vi.spyOn(api, "createActionTaken").mockResolvedValue({
      id: 103,
      ticketId: 10,
      actionDateTime: new Date().toISOString(),
      description: "Added static DHCP reservation for client host.",
      result: "Host acquired assigned IP 10.0.1.45 successfully.",
      performedById: 5,
      performedBy: { id: 5, name: "Staff Alex", role: "IT_STAFF" },
      isFollowUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // UI-01 (AC-01, AC-02, BR-01..BR-04)
  it("UI-01: IT Staff views Actions Taken table, opens Create Modal, validates follow-up note and submits", async () => {
    render(<ActionsTakenSection ticketId={10} currentUser={mockStaffUser} isReadOnly={false} />);

    // Verify loading and loaded state
    await waitFor(() => {
      expect(screen.getByTestId("actions-count-badge")).toHaveTextContent("2");
    });

    expect(screen.getByText("Replaced faulty switch port and tested packet loss.")).toBeInTheDocument();
    expect(screen.getByText("Re-seated transceiver module on distribution router.")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Required")).toBeInTheDocument();
    expect(screen.getByTestId("followup-note-101")).toHaveTextContent(
      "Monitor CRC error counts tomorrow morning at 09:00."
    );

    // Verify Add Action Taken button is present for IT Staff
    const addBtn = screen.getByTestId("add-action-taken-btn");
    expect(addBtn).toBeInTheDocument();

    // Click to open modal
    fireEvent.click(addBtn);

    expect(screen.getByTestId("action-taken-modal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Record Action Taken/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Action will be recorded under your authenticated account/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("action-taken-modal")).toHaveTextContent("Staff Alex");

    // Submit with empty inputs -> validates description and result
    const submitBtn = screen.getByTestId("submit-action-taken-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Action description must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Action result must be at least 3 characters/i)).toBeInTheDocument();
    });

    // Fill valid description and result
    const descInput = screen.getByLabelText(/Description of Action Taken/i);
    const resultInput = screen.getByLabelText(/Outcome \/ Result/i);
    fireEvent.change(descInput, {
      target: { value: "Added static DHCP reservation for client host." },
    });
    fireEvent.change(resultInput, {
      target: { value: "Host acquired assigned IP 10.0.1.45 successfully." },
    });

    // Toggle Follow-up checkbox
    const followUpCheckbox = screen.getByLabelText(/Follow-up Required/i);
    fireEvent.click(followUpCheckbox);

    // Follow-up note field should appear and be required
    expect(screen.getByLabelText(/Follow-up Instructions \/ Note/i)).toBeInTheDocument();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Follow-up note is required/i)).toBeInTheDocument();
    });

    // Uncheck Follow-up
    fireEvent.click(followUpCheckbox);

    // Submit form successfully
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createActionTaken).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          description: "Added static DHCP reservation for client host.",
          result: "Host acquired assigned IP 10.0.1.45 successfully.",
          isFollowUpRequired: false,
        })
      );
    });
  });

  // UI-02 (AC-03, BR-07)
  it("UI-02: Requester views Actions Taken in read-only format without add or edit controls", async () => {
    render(<ActionsTakenSection ticketId={10} currentUser={mockRequesterUser} isReadOnly={true} />);

    await waitFor(() => {
      expect(screen.getByTestId("actions-count-badge")).toHaveTextContent("2");
    });

    // Verify table content rendered
    expect(screen.getByText("Replaced faulty switch port and tested packet loss.")).toBeInTheDocument();
    expect(screen.getByText("Re-seated transceiver module on distribution router.")).toBeInTheDocument();

    // Verify NO Add or Edit buttons are rendered for Requester
    expect(screen.queryByTestId("add-action-taken-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-action-btn-101")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-action-btn-102")).not.toBeInTheDocument();
  });
});
