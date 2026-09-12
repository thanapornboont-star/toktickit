import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Login } from "../../src/components/Login.js";
import * as api from "../../src/api.js";

describe("Login Component (Work Item 3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders login form with email, password, and sign in action", () => {
    render(<Login onSuccess={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("validates required fields inline on empty submit", async () => {
    render(<Login onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it("shows busy state while login request is in flight", async () => {
    let resolveLogin: (val: any) => void = () => {};
    vi.spyOn(api, "login").mockImplementation(
      () => new Promise((resolve) => { resolveLogin = resolve; })
    );

    render(<Login onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "test@toktickit.local" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByText(/Signing in\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Signing in\.\.\./i })).toBeDisabled();

    // Resolve login
    resolveLogin({
      token: "toktickit_session_abc",
      user: {
        id: 1,
        email: "test@toktickit.local",
        name: "Test User",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    await waitFor(() => {
      expect(screen.queryByText(/Signing in\.\.\./i)).not.toBeInTheDocument();
    });
  });

  it("shows safe error alert on invalid credentials", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("Invalid email or password. Please try again."));

    render(<Login onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "test@toktickit.local" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "WrongPass!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Invalid email or password/i);
  });

  it("shows deactivated account alert when account is inactive", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new Error("Account is deactivated. Please contact an administrator.")
    );

    render(<Login onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "inactive@toktickit.local" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Account is deactivated/i);
  });

  it("successfully calls onSuccess when login succeeds", async () => {
    const onSuccess = vi.fn();
    const mockUser: api.AuthUser = {
      id: 1,
      email: "jennifer.anderson@toktickit.local",
      name: "Jennifer Anderson",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    };

    vi.spyOn(api, "login").mockResolvedValue({
      token: "toktickit_session_xyz123",
      user: mockUser,
    });

    render(<Login onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: mockUser.email },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("toktickit_session_xyz123", mockUser);
    });
  });

  it("toggles password visibility", () => {
    render(<Login onSuccess={vi.fn()} />);

    const passwordInput = screen.getByLabelText(/^Password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen.getByRole("button", { name: /Show password/i });
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
