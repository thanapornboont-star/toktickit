const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface DevRequester {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

export const DEV_REQUESTER_STORAGE_KEY = "toktickit.devRequester";

export async function getDevRequesters(): Promise<DevRequester[]> {
  const response = await fetch(`${API_URL}/api/dev-requesters`);
  if (!response.ok) throw new Error("Unable to load development requesters. Please try again.");
  return response.json();
}

export function getStoredDevRequester(): DevRequester | null {
  const stored = sessionStorage.getItem(DEV_REQUESTER_STORAGE_KEY);
  if (!stored) return null;
  try { return JSON.parse(stored) as DevRequester; }
  catch { sessionStorage.removeItem(DEV_REQUESTER_STORAGE_KEY); return null; }
}

export function storeDevRequester(requester: DevRequester) {
  sessionStorage.setItem(DEV_REQUESTER_STORAGE_KEY, JSON.stringify(requester));
}

export function clearStoredDevRequester() {
  sessionStorage.removeItem(DEV_REQUESTER_STORAGE_KEY);
}
