import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserManagement } from "../../src/components/UserManagement.js";
import * as api from "../../src/api.js";
import { AdminUserItem, AuthUser } from "../../src/api.js";

const mockAdminUser: AuthUser = {
  id: 100,
  email: "admin.boss@toktickit.local",
  name: "Admin Boss",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
};

const mockUsers: AdminUserItem[] = [
  {
    id: 100,
    name: "Admin Boss",
    email: "admin.boss@toktickit.local",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-12T10:00:00.000Z",
  },
  {
    id: 101,
    name: "Staff Alex",
    email: "staff.alex@toktickit.local",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-12T10:05:00.000Z",
  },
  {
    id: 102,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.local",
    role: "REQUESTER",
    isActive: false,
    mustChangePassword: true,
    createdAt: "2026-09-12T10:10:00.000Z",
  },
];

describe("Work Item 7: UserManagement Component (UI-05)", () => {
  beforeEach(() => {
    vi.spyOn(api, "getAdminUsers").mockResolvedValue(mockUsers);
    vi.spyOn(api, "createAdminUser").mockResolvedValue({
      id: 103,
      name: "Dwight Schrute",
      email: "dwight@toktickit.local",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    });
    vi.spyOn(api, "updateAdminUser").mockResolvedValue({
      id: 101,
      name: "Staff Alexander",
      email: "staff.alex@toktickit.local",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
    });
    vi.spyOn(api, "resetUserPassword").mockResolvedValue({
      id: 101,
      mustChangePassword: true,
      message: "Initial password set.",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders user directory with names, emails, role badges, and status badges (AC-17, UI-05)", async () => {
    render(<UserManagement authUser={mockAdminUser} />);

    expect(screen.getByText("Loading users...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("User Account Maintenance")).toBeInTheDocument();
      expect(screen.getByText("Admin Boss")).toBeInTheDocument();
      expect(screen.getByText("Staff Alex")).toBeInTheDocument();
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
      expect(screen.getByText("admin.boss@toktickit.local")).toBeInTheDocument();
    });

    // Check role badges
    expect(screen.getByText("ADMINISTRATOR")).toBeInTheDocument();
    expect(screen.getByText("IT STAFF")).toBeInTheDocument();
    expect(screen.getByText("REQUESTER")).toBeInTheDocument();

    // Check status badges
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Must Change")).toBeInTheDocument();
  });

  it("queries getAdminUsers when search or role filter is changed (AC-17)", async () => {
    render(<UserManagement authUser={mockAdminUser} />);

    await waitFor(() => {
      expect(api.getAdminUsers).toHaveBeenCalledWith({
        search: undefined,
        role: undefined,
      });
    });

    const searchInput = screen.getByPlaceholderText("Search by name or email...");
    fireEvent.change(searchInput, { target: { value: "alex" } });

    await waitFor(() => {
      expect(api.getAdminUsers).toHaveBeenCalledWith({
        search: "alex",
        role: undefined,
      });
    });

    const roleSelect = screen.getByLabelText("Filter by role");
    fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

    await waitFor(() => {
      expect(api.getAdminUsers).toHaveBeenCalledWith({
        search: "alex",
        role: "IT_STAFF",
      });
    });
  });

  it("opens Create User modal and submits new user successfully (AC-18, BR-24)", async () => {
    render(<UserManagement authUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText("Admin Boss")).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /Add new user/i });
    fireEvent.click(addButton);

    expect(screen.getByText("Add New User Account")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText(/Full Name \*/i), {
      target: { value: "Dwight Schrute" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address \*/i), {
      target: { value: "dwight@toktickit.local" },
    });
    fireEvent.change(screen.getByLabelText(/Assigned Role \*/i), {
      target: { value: "IT_STAFF" },
    });
    fireEvent.change(screen.getByLabelText(/Initial Temporary Password \*/i), {
      target: { value: "SecretPass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(api.createAdminUser).toHaveBeenCalledWith({
        name: "Dwight Schrute",
        email: "dwight@toktickit.local",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "SecretPass123!",
      });
    });
  });

  it("opens Edit modal and updates user details (AC-20, AC-21)", async () => {
    render(<UserManagement authUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText("Staff Alex")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    // Click edit on Staff Alex (index 1)
    fireEvent.click(editButtons[1]);

    expect(screen.getByText(/Edit User: Staff Alex/i)).toBeInTheDocument();

    const nameInput = screen.getByLabelText("Full Name");
    fireEvent.change(nameInput, { target: { value: "Staff Alexander" } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(api.updateAdminUser).toHaveBeenCalledWith(101, {
        name: "Staff Alexander",
        email: "staff.alex@toktickit.local",
        role: "IT_STAFF",
        isActive: true,
      });
    });
  });

  it("disables active checkbox and shows warning when editing own administrator account (AC-20, BR-21)", async () => {
    render(<UserManagement authUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText("Admin Boss")).toBeInTheDocument();
    });

    // Click edit on Admin Boss (self, index 0)
    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[0]);

    expect(screen.getByText(/Edit User: Admin Boss/i)).toBeInTheDocument();

    const activeCheckbox = screen.getByLabelText("Active Account");
    expect(activeCheckbox).toBeDisabled();
    expect(screen.getByTestId("self-deactivation-warning")).toHaveTextContent(
      "Cannot deactivate your own administrator account (BR-21)."
    );
  });

  it("resets initial password inside edit modal (AC-22, BR-24)", async () => {
    render(<UserManagement authUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText("Staff Alex")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[1]);

    const passwordInput = screen.getByLabelText("New initial password");
    fireEvent.change(passwordInput, { target: { value: "TemporaryReset123!" } });

    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(api.resetUserPassword).toHaveBeenCalledWith(101, "TemporaryReset123!");
      expect(
        screen.getByText(
          "Initial password set. User will be required to change password on next login."
        )
      ).toBeInTheDocument();
    });
  });
});
