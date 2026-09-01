const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface DevRequester {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface RelatedSystem {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface AttachmentItem {
  id: number;
  ticketId: number;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  isRemoved: boolean;
  removedAt?: string | null;
  removalReason?: string | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  status: "NEW";
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  relatedSystem?: { id: number; name: string };
  requester?: { id: number; name: string; email: string };
  attachments?: AttachmentItem[];
}

export interface CreateTicketPayload {
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
}

export const DEV_REQUESTER_STORAGE_KEY = "toktickit.devRequester";

export async function getDevRequesters(): Promise<DevRequester[]> {
  const response = await fetch(`${API_URL}/api/dev-requesters`);
  if (!response.ok) throw new Error("Unable to load development requesters. Please try again.");
  return response.json();
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/api/categories`);
  if (!response.ok) throw new Error("Failed to load IT categories.");
  return response.json();
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  const response = await fetch(`${API_URL}/api/related-systems`);
  if (!response.ok) throw new Error("Failed to load related systems.");
  return response.json();
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId: number
): Promise<Ticket> {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Dev-Requester-Id": String(requesterId),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || "Failed to create ticket.";
    const error: any = new Error(errorMsg);
    error.details = data?.error?.details;
    throw error;
  }

  return data;
}

export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId: number
): Promise<AttachmentItem> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "X-Dev-Requester-Id": String(requesterId),
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to upload attachment.");
  }

  return data;
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
