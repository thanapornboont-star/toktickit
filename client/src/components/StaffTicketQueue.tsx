import { useCallback, useEffect, useState } from "react";
import {
  AuthUser,
  Category,
  GetStaffTicketsParams,
  StaffTicketSummary,
  StaffTicketPagination,
  getCategories,
  getStaffTickets,
} from "../api.js";

type SortField = "createdAt" | "updatedAt" | "ticketNumber" | "itPriority";
type SortOrder = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE: Record<string, string> = {
  NEW: "badge-status-new",
  OPEN: "badge-status-open",
  IN_PROGRESS: "badge-status-inprogress",
  WAITING_FOR_REQUESTER: "badge-status-waiting",
  RESOLVED: "badge-status-resolved",
  CLOSED: "badge-status-closed",
  REOPENED: "badge-status-reopened",
  CANCELLED: "badge-status-cancelled",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "badge-priority-low",
  MEDIUM: "badge-priority-medium",
  HIGH: "badge-priority-high",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`badge ${PRIORITY_BADGE[priority] ?? "bg-secondary"}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_BADGE[status] ?? "bg-secondary"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function StaffTicketQueue({
  authUser,
  onViewTicket,
}: {
  authUser: AuthUser;
  onViewTicket?: (ticketId: number) => void;
}) {
  const [tickets, setTickets] = useState<StaffTicketSummary[]>([]);
  const [pagination, setPagination] = useState<StaffTicketPagination>({
    page: 1,
    pageSize: 10,
    totalTickets: 0,
    totalPages: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [itPriorityFilter, setItPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch {
      // Non-fatal; filters still work without categories
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoadState("loading");
    try {
      const params: GetStaffTicketsParams = {
        page,
        pageSize: 10,
        sortBy,
        sortOrder,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (itPriorityFilter) params.itPriority = itPriorityFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (ownerFilter) params.ownerId = ownerFilter === "unassigned" ? "unassigned" : Number(ownerFilter);

      const result = await getStaffTickets(params);
      setTickets(result.tickets);
      setPagination(result.pagination);
      setLoadState("ready");
    } catch (err: any) {
      if (err?.message?.includes("403") || err?.code === "FORBIDDEN") {
        setLoadState("forbidden");
      } else {
        setErrorMsg(err?.message ?? "Failed to load ticket queue.");
        setLoadState("error");
      }
    }
  }, [page, sortBy, sortOrder, search, statusFilter, itPriorityFilter, categoryFilter, ownerFilter]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, itPriorityFilter, categoryFilter, ownerFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <span aria-hidden="true"> ↕</span>;
    return <span aria-hidden="true">{sortOrder === "asc" ? " ↑" : " ↓"}</span>;
  }

  if (loadState === "forbidden") {
    return (
      <section className="zen-card" aria-labelledby="queue-forbidden-title">
        <h2 id="queue-forbidden-title">Access Denied</h2>
        <div className="alert alert-danger" role="alert">
          You do not have permission to access the IT Staff ticket queue.
        </div>
      </section>
    );
  }

  return (
    <section className="zen-card" aria-labelledby="staff-queue-title">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 id="staff-queue-title" className="mb-0">
          IT Staff Ticket Queue
        </h2>
        {loadState === "ready" && (
          <span className="text-muted small">
            {pagination.totalTickets} ticket{pagination.totalTickets !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="queue-toolbar queue-filter-toolbar mb-3" aria-label="Queue filters and search">
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <label htmlFor="queue-search" className="visually-hidden">
              Search tickets
            </label>
            <input
              id="queue-search"
              type="search"
              className="form-control"
              placeholder="Search ticket number or summary…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search tickets"
            />
          </div>
          <div className="col-6 col-md-2">
            <label htmlFor="filter-status" className="visually-hidden">
              Filter by status
            </label>
            <select
              id="filter-status"
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label htmlFor="filter-it-priority" className="visually-hidden">
              Filter by IT priority
            </label>
            <select
              id="filter-it-priority"
              className="form-select"
              value={itPriorityFilter}
              onChange={(e) => setItPriorityFilter(e.target.value)}
              aria-label="Filter by IT priority"
            >
              <option value="">All IT Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label htmlFor="filter-category" className="visually-hidden">
              Filter by category
            </label>
            <select
              id="filter-category"
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label htmlFor="filter-owner" className="visually-hidden">
              Filter by owner
            </label>
            <select
              id="filter-owner"
              className="form-select"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              aria-label="Filter by assignment"
            >
              <option value="">All Assignments</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadState === "loading" && (
        <div className="text-center py-4" role="status" aria-live="polite">
          <div className="spinner-border text-success" aria-hidden="true" />
          <p className="mt-2 text-muted">Loading ticket queue…</p>
        </div>
      )}

      {/* Error */}
      {loadState === "error" && (
        <div className="alert alert-danger" role="alert">
          {errorMsg}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={() => void loadTickets()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {loadState === "ready" && tickets.length === 0 && (
        <div className="text-center py-5 text-muted" role="status">
          <p className="mb-0">No tickets match your current filters.</p>
        </div>
      )}

      {/* Queue Table (desktop) */}
      {loadState === "ready" && tickets.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="table-responsive d-none d-md-block" aria-label="Ticket queue">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th scope="col">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold text-dark"
                      onClick={() => handleSort("ticketNumber")}
                      aria-label="Sort by ticket number"
                    >
                      Ticket #<SortIcon field="ticketNumber" />
                    </button>
                  </th>
                  <th scope="col">Summary</th>
                  <th scope="col">Category</th>
                  <th scope="col">Req. Priority</th>
                  <th scope="col">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold text-dark"
                      onClick={() => handleSort("itPriority")}
                      aria-label="Sort by IT priority"
                    >
                      IT Priority<SortIcon field="itPriority" />
                    </button>
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Owner</th>
                  <th scope="col">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold text-dark"
                      onClick={() => handleSort("updatedAt")}
                      aria-label="Sort by last updated"
                    >
                      Last Updated<SortIcon field="updatedAt" />
                    </button>
                  </th>
                  <th scope="col" className="text-end">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <code className="small">{ticket.ticketNumber}</code>
                    </td>
                    <td className="queue-summary">{ticket.summary}</td>
                    <td>{ticket.category?.name ?? <span className="text-muted">—</span>}</td>
                    <td>
                      <PriorityBadge priority={ticket.requestedPriority} />
                    </td>
                    <td>
                      <PriorityBadge priority={ticket.itPriority} />
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                      {ticket.requesterIndicatedResolved && (
                        <span
                          className="badge bg-info ms-1 small"
                          title="Requester indicated resolved"
                          aria-label="Requester indicated resolved"
                        >
                          ✓ Req. Resolved
                        </span>
                      )}
                    </td>
                    <td>
                      {ticket.owner ? (
                        ticket.owner.name
                      ) : (
                        <span className="text-muted fst-italic">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <time dateTime={ticket.updatedAt}>
                        {new Date(ticket.updatedAt).toLocaleDateString()}
                      </time>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm zen-primary-button"
                        onClick={() => onViewTicket?.(ticket.id)}
                        aria-label={`Open ticket ${ticket.ticketNumber}`}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <ul className="list-unstyled d-block d-md-none" aria-label="Ticket queue">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="queue-card mb-3 p-3 border rounded">
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <code className="small text-muted">{ticket.ticketNumber}</code>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="fw-semibold mb-1">{ticket.summary}</p>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  <PriorityBadge priority={ticket.itPriority} />
                  {ticket.category && (
                    <span className="badge bg-light text-dark border">{ticket.category.name}</span>
                  )}
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    {ticket.owner ? ticket.owner.name : <span className="fst-italic">Unassigned</span>}
                  </small>
                  <button
                    type="button"
                    className="btn btn-sm zen-primary-button"
                    onClick={() => onViewTicket?.(ticket.id)}
                    aria-label={`Open ticket ${ticket.ticketNumber}`}
                  >
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav aria-label="Ticket queue pagination" className="mt-3">
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                    disabled={page === 1}
                  >
                    &laquo;
                  </button>
                </li>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage(p)}
                      aria-current={p === page ? "page" : undefined}
                      aria-label={`Page ${p}`}
                    >
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page === pagination.totalPages ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    aria-label="Next page"
                    disabled={page === pagination.totalPages}
                  >
                    &raquo;
                  </button>
                </li>
              </ul>
              <p className="text-center text-muted small mt-1">
                Page {pagination.page} of {pagination.totalPages}
              </p>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
