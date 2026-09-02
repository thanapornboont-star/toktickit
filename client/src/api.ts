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
  status: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  relatedSystem?: { id: number; name: string };
  requester?: { id: number; name: string; email: string };
  activeAttachmentCount?: number;
  attachments?: AttachmentItem[];
}

export interface CreateTicketPayload {
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
}

export interface GetTicketsParams {
  search?: string;
  categoryId?: number | string;
  requestedPriority?: string;
  status?: string;
  sortBy?: "createdAt" | "ticketNumber" | "requestedPriority";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedTicketsResponse {
  data: Ticket[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
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

export async function getMyTickets(
  params: GetTicketsParams,
  requesterId: number
): Promise<PaginatedTicketsResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.status) query.set("status", params.status);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const response = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    headers: {
      "X-Dev-Requester-Id": String(requesterId),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tickets.");
  }

  return response.json();
}

export async function getTicketById(id: number, requesterId: number): Promise<Ticket> {
  const response = await fetch(`${API_URL}/api/tickets/${id}`, {
    headers: {
      "X-Dev-Requester-Id": String(requesterId),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data?.error?.message || "Failed to load ticket.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function removeAttachment(
  ticketId: number,
  attachmentId: number,
  reason: string,
  requesterId: number
): Promise<AttachmentItem> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Dev-Requester-Id": String(requesterId),
    },
    body: JSON.stringify({ reason }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to remove attachment.");
  }

  return data;
}

export async function downloadAttachment(
  ticketId: number,
  attachmentId: number,
  requesterId: number
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download`,
    {
      headers: {
        "X-Dev-Requester-Id": String(requesterId),
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to download attachment.");
  }

  return response.blob();
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
