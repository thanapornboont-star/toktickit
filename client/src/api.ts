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
  itPriority?: "LOW" | "MEDIUM" | "HIGH";
  status: string;
  requesterIndicatedResolved?: boolean;
  requesterId: number;
  ownerId?: number | null;
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

function getAuthHeaders(requesterId?: number): Record<string, string> {
  const headers: Record<string, string> = {};
  const auth = getStoredAuth();
  if (auth?.token) {
    headers["Authorization"] = `Bearer ${auth.token}`;
  } else if (requesterId) {
    headers["X-Dev-Requester-Id"] = String(requesterId);
  }
  return headers;
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId?: number
): Promise<Ticket> {
  const headers = getAuthHeaders(requesterId);
  headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers,
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
  requesterId?: number
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
    headers: getAuthHeaders(requesterId),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tickets.");
  }

  return response.json();
}

export async function getTicketById(id: number, requesterId?: number): Promise<Ticket> {
  const response = await fetch(`${API_URL}/api/tickets/${id}`, {
    headers: getAuthHeaders(requesterId),
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
  requesterId?: number
): Promise<AttachmentItem> {
  const headers = getAuthHeaders(requesterId);
  headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers,
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
  requesterId?: number
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download`,
    {
      headers: getAuthHeaders(requesterId),
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
  requesterId?: number
): Promise<AttachmentItem> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: getAuthHeaders(requesterId),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to upload attachment.");
  }

  return data;
}

export interface PublicCommentItem {
  id: number;
  ticketId: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: Role;
  };
  createdAt: string;
}

export async function getPublicComments(
  ticketId: number,
  requesterId?: number
): Promise<PublicCommentItem[]> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/public-comments`, {
    headers: getAuthHeaders(requesterId),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data?.error?.message || "Failed to load public comments.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function createPublicComment(
  ticketId: number,
  content: string,
  requesterId?: number
): Promise<{ comment: PublicCommentItem }> {
  const headers = getAuthHeaders(requesterId);
  headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/public-comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data?.error?.message || "Failed to post comment.");
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

export async function indicateProblemResolved(
  ticketId: number,
  requesterId?: number
): Promise<{ message: string; ticket: { id: number; requesterIndicatedResolved: boolean } }> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/indicate-resolved`, {
    method: "POST",
    headers: getAuthHeaders(requesterId),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data?.error?.message || "Failed to indicate problem resolved.");
    error.status = response.status;
    throw error;
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

// ---------------------------------------------------------------------------
// Lab 3 Authentication & RBAC
// ---------------------------------------------------------------------------
export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const AUTH_TOKEN_KEY = "toktickit.token";
export const AUTH_USER_KEY = "toktickit.user";

export function getStoredAuth(): { token: string; user: AuthUser } | null {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const userJson = sessionStorage.getItem(AUTH_USER_KEY);
  if (!token || !userJson) return null;
  try {
    const user = JSON.parse(userJson) as AuthUser;
    return { token, user };
  } catch {
    clearStoredAuth();
    return null;
  }
}

export function storeAuth(token: string, user: AuthUser): void {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data?.error?.message || "Invalid email or password. Please try again.");
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

export async function logout(token: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } finally {
    clearStoredAuth();
  }
}

export async function getMe(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Session expired. Please sign in again.");
  }

  return data.user;
}

export async function changePassword(
  token: string,
  payload: { currentPassword: string; newPassword: string; confirmPassword: string }
): Promise<{ message: string; user: AuthUser }> {
  const response = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data?.error?.message || "Failed to change password.");
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Staff Queue Types & API (Work Item 5)
// ---------------------------------------------------------------------------

export interface StaffTicketSummary {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  itPriority: "LOW" | "MEDIUM" | "HIGH";
  status: string;
  requesterIndicatedResolved: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string } | null;
  requester: { id: number; name: string } | null;
  owner: { id: number; name: string } | null;
}

export interface StaffTicketDetail extends StaffTicketSummary {
  description: string;
  relatedSystem: { id: number; name: string } | null;
  requester: { id: number; name: string; email: string } | null;
  owner: { id: number; name: string; email: string } | null;
  attachments: AttachmentItem[];
}

export interface StaffTicketPagination {
  page: number;
  pageSize: number;
  totalTickets: number;
  totalPages: number;
}

export interface GetStaffTicketsParams {
  search?: string;
  categoryId?: number | string;
  status?: string;
  requestedPriority?: string;
  itPriority?: string;
  ownerId?: number | "unassigned";
  sortBy?: "createdAt" | "updatedAt" | "ticketNumber" | "itPriority";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: "IT_STAFF" | "ADMINISTRATOR";
}

export async function getStaffTickets(
  params: GetStaffTicketsParams
): Promise<{ tickets: StaffTicketSummary[]; pagination: StaffTicketPagination }> {
  const headers = getAuthHeaders();
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.status) query.set("status", params.status);
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.ownerId !== undefined) query.set("ownerId", String(params.ownerId));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const response = await fetch(`${API_URL}/api/staff/tickets?${query.toString()}`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to load staff ticket queue.");
  return data;
}

export async function getStaffTicketDetail(ticketId: number): Promise<StaffTicketDetail> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to load ticket detail.");
  return data.ticket;
}

export async function getStaffMembers(): Promise<StaffMember[]> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_URL}/api/staff/members`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to load staff members.");
  return data;
}

export interface InternalNoteItem {
  id: number;
  ticketId: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
  createdAt: string;
}

export async function updateTicketOwner(
  ticketId: number,
  ownerId: number | null
): Promise<{ id: number; ownerId: number | null; owner: { id: number; name: string } | null }> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/owner`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ ownerId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to update ticket owner.");
  return data.ticket;
}

export async function updateTicketPriority(
  ticketId: number,
  itPriority: "LOW" | "MEDIUM" | "HIGH"
): Promise<{ id: number; itPriority: string }> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ itPriority }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to update IT Priority.");
  return data.ticket;
}

export async function updateTicketStatus(
  ticketId: number,
  status: string
): Promise<{ id: number; status: string }> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to update ticket status.");
  return data.ticket;
}

export async function getInternalNotes(ticketId: number): Promise<InternalNoteItem[]> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/internal-notes`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to load internal notes.");
  return data;
}

export async function createInternalNote(
  ticketId: number,
  content: string
): Promise<InternalNoteItem> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/internal-notes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to post internal note.");
  return data.internalNote;
}

// ---------------------------------------------------------------------------
// Administrator User Management APIs (Work Item 7)
// ---------------------------------------------------------------------------
export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt?: string;
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive?: boolean;
  initialPassword: string;
}

export interface UpdateAdminUserPayload {
  name?: string;
  email?: string;
  role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive?: boolean;
}

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
}): Promise<AdminUserItem[]> {
  const headers = getAuthHeaders();
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.role) query.set("role", params.role);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/api/admin/users${qs}`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to load users.");
  return data;
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUserItem> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}/api/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to create user.");
  return data.user;
}

export async function updateAdminUser(
  userId: number,
  payload: UpdateAdminUserPayload
): Promise<AdminUserItem> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to update user.");
  return data.user;
}

export async function resetUserPassword(
  userId: number,
  newInitialPassword: string
): Promise<{ id: number; mustChangePassword: boolean; message: string }> {
  const headers = getAuthHeaders();
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}/api/admin/users/${userId}/reset-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ newInitialPassword }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Failed to reset password.");
  return data;
}


