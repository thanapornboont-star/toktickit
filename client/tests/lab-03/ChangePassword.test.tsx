import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChangePassword } from "../../src/components/ChangePassword.js";
import * as api from "../../src/api.js";

const mockInitialUser: api.AuthUser = {
  id: 10,
  email: "new.user@toktickit.local",
  name: "New Requester",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: true,
};

describe("ChangePassword Component (Work Item 3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders change password form, description, and interactive checklist", () => {
    render(
      <ChangePassword
        token="toktickit_session_sample"
        user={mockInitialUser}
        onSuccess={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /Change Your Password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Current \(temporary\) password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm new password/i)).toBeInTheDocument();
    expect(screen.getByText(/Be at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Include uppercase and lowercase letters/i)).toBeInTheDocument();
    expect(screen.getByText(/Include a number and a special character/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
  });

  it("validates required fields on empty submit", async () => {
    render(
      <ChangePassword
        token="toktickit_session_sample"
        user={mockInitialUser}
        onSuccess={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText(/Current password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/New password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmation password is required/i)).toBeInTheDocument();
  });

  it("validates that new password meets complexity rules", async () => {
    render(
      <ChangePassword
        token="toktickit_session_sample"
        user={mockInitialUser}
        onSuccess={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Current \(temporary\) password/i), {
      target: { value: "Initial123!" },
    });
    fireEvent.change(screen.getByLabelText(/^New password/i), {
      target: { value: "weak" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), {
      target: { value: "weak" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText(/Password does not meet all policy requirements/i)).toBeInTheDocument();
  });

  it("validates that confirmation password matches new password", async () => {
    render(
      <ChangePassword
        token="toktickit_session_sample"
        user={mockInitialUser}
        onSuccess={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Current \(temporary\) password/i), {
      target: { value: "Initial123!" },
    });
    fireEvent.change(screen.getByLabelText(/^New password/i), {
      target: { value: "ValidNewPass123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), {
      target: { value: "MismatchedPass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it("shows error alert when API returns failure (e.g. wrong current password)", async () => {
    vi.spyOn(api, "changePassword").mockRejectedValue(
      new Error("Current password is incorrect.")
    );

    render(
      <ChangePassword
        token="toktickit_session_sample"
        user={mockInitialUser}
        onSuccess={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Current \(temporary\) password/i), {
      target: { value: "WrongCurrentPass!" },
    });
    fireEvent.change(screen.getByLabelText(/^New password/i), {
      target: { value: "ValidNewPass123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), {
      target: { value: "ValidNewPass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Current password is incorrect/i);
  });

  it("successfully changes password and calls onSuccess with updated user", async () => {
    const onSuccess = vi.fn();
    const updatedUser: api.AuthUser = {
      ...mockInitialUser,
      mustChangePassword: false,
    };

    vi.spyOn(api, "changePassword").mockResolvedValue({
      message: "Password changed successfully",
      user: updatedUser,
    });

    render(
      <ChangePassword
        token="toktickit_session_sample"
        user={mockInitialUser}
        onSuccess={onSuccess}
        onLogout={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Current \(temporary\) password/i), {
      target: { value: "Initial123!" },
    });
    fireEvent.change(screen.getByLabelText(/^New password/i), {
      target: { value: "ValidNewPass123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), {
      target: { value: "ValidNewPass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(updatedUser);
    });
  });

  it("calls onLogout when user clicks Cancel & Sign Out", () => {
    const onLogout = vi.fn();

    render(
      <ChangePassword
        token="toktickit_session_sample"
        user={mockInitialUser}
        onSuccess={vi.fn()}
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancel & Sign Out/i }));

    expect(onLogout).toHaveBeenCalled();
  });
});
