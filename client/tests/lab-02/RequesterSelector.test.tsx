import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requesters = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer@example.test", department: "Human Resources", isActive: true },
  { id: 2, name: "Michael Brown", email: "michael@example.test", department: "Finance", isActive: true },
];

describe("Development Requester Selector", () => {
  beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("UI-01: shows a loading state before requesters arrive", () => {
    vi.spyOn(api, "getDevRequesters").mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText(/Loading development requesters/i)).toBeInTheDocument();
  });

  it("lists active requesters and requires a selection before continuing", async () => {
    vi.spyOn(api, "getDevRequesters").mockResolvedValue(requesters);
    render(<App />);
    const continueButton = await screen.findByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();
    expect(screen.getByRole("option", { name: /Jennifer Anderson.*Human Resources/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Development requester", { exact: true }), { target: { value: "1" } });
    expect(continueButton).toBeEnabled();
  });

  it("persists the selected requester and renders the application shell", async () => {
    vi.spyOn(api, "getDevRequesters").mockResolvedValue(requesters);
    render(<App />);
    fireEvent.change(await screen.findByLabelText("Development requester", { exact: true }), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByLabelText(/Current requester: Michael Brown/i)).toBeInTheDocument();
    expect(sessionStorage.getItem(api.DEV_REQUESTER_STORAGE_KEY)).toContain("Michael Brown");
    expect(screen.getByRole("button", { name: /Change Requester/i })).toBeInTheDocument();
  });

  it("revalidates a stored requester against the current active requester list", async () => {
    sessionStorage.setItem(api.DEV_REQUESTER_STORAGE_KEY, JSON.stringify(requesters[0]));
    vi.spyOn(api, "getDevRequesters").mockResolvedValue([requesters[1]]);
    render(<App />);
    expect(await screen.findByRole("heading", { name: /Development Requester Selection/i })).toBeInTheDocument();
    expect(sessionStorage.getItem(api.DEV_REQUESTER_STORAGE_KEY)).toBeNull();
  });

  it("shows an error with Retry and recovers when the request succeeds", async () => {
    const getRequesters = vi.spyOn(api, "getDevRequesters");
    getRequesters.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce(requesters);
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Development Requester Selection/i })).toBeInTheDocument());
  });
});
