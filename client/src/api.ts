const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  try {
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (!healthRes.ok) {
      throw new Error(`API health check returned status ${healthRes.status}`);
    }

    const catRes = await fetch(`${API_URL}/api/categories`);
    if (!catRes.ok) {
      throw new Error(`Failed to fetch categories (status ${catRes.status})`);
    }
    const categories: Category[] = await catRes.json();

    return { online: true, categories };
  } catch (err: any) {
    if (
      err.message &&
      (err.message.startsWith("API health check") ||
        err.message.startsWith("Failed to fetch categories"))
    ) {
      throw err;
    }
    throw new Error("Unable to connect to TokTickIT API server (Server is offline or unreachable)");
  }
}
