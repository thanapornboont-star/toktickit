import React, { useEffect, useState, useCallback } from "react";
import {
  Category,
  DevRequester,
  getCategories,
  getMyTickets,
  PaginatedTicketsResponse,
  Ticket,
} from "../api.js";

interface MyTicketsProps {
  requester: DevRequester;
  onCreateTicket: () => void;
  onViewTicketDetail?: (ticketId: number) => void;
}

export function MyTickets({ requester, onCreateTicket, onViewTicketDetail }: MyTicketsProps) {
  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter & Search states
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "ticketNumber" | "requestedPriority">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Data & loading states
  const [ticketData, setTicketData] = useState<PaginatedTicketsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Load categories once
  useEffect(() => {
    let isMounted = true;
    async function loadCats() {
      try {
        const cats = await getCategories();
        if (isMounted) setCategories(cats);
      } catch (err) {
        // non-blocking for categories filter
      }
    }
    void loadCats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch tickets for current requester
  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const res = await getMyTickets(
        {
          search,
          categoryId: categoryId || undefined,
          requestedPriority: requestedPriority || undefined,
          sortBy,
          sortOrder,
          page,
          pageSize,
        },
        requester.id
      );
      setTicketData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load tickets.");
    } finally {
      setIsLoading(false);
    }
  }, [requester.id, search, categoryId, requestedPriority, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  // Handle Search submit
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  // Clear filters
  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(search || categoryId || requestedPriority);

  function handleSortToggle(field: "createdAt" | "ticketNumber" | "requestedPriority") {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <span className="badge bg-danger">HIGH</span>;
      case "MEDIUM":
        return <span className="badge bg-warning text-dark">MEDIUM</span>;
      case "LOW":
        return <span className="badge bg-success">LOW</span>;
      default:
        return <span className="badge bg-secondary">{priority}</span>;
    }
  };

  return (
    <section className="zen-card" aria-labelledby="my-tickets-heading">
      {/* Header & Create Button */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <p className="eyebrow mb-1">Requester Workspace</p>
          <h2 id="my-tickets-heading" className="mb-0">My IT Support Tickets</h2>
        </div>
        <button
          type="button"
          className="btn zen-primary-button d-inline-flex align-items-center gap-2"
          onClick={onCreateTicket}
        >
          <span>+ Create Ticket</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <div>{errorMessage}</div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void fetchTickets()}>
            Retry
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="p-3 bg-light rounded border mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label htmlFor="ticket-search" className="form-label small fw-semibold">
              Search Tickets
            </label>
            <div className="input-group">
              <input
                id="ticket-search"
                type="text"
                className="form-control"
                placeholder="Search by ticket number or summary…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button className="btn btn-outline-secondary" type="submit">
                Search
              </button>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <label htmlFor="filter-category" className="form-label small fw-semibold">
              Category
            </label>
            <select
              id="filter-category"
              className="form-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3">
            <label htmlFor="filter-priority" className="form-label small fw-semibold">
              Priority
            </label>
            <select
              id="filter-priority"
              className="form-select"
              value={requestedPriority}
              onChange={(e) => {
                setRequestedPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>

          <div className="col-12 col-md-2">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-success mb-3" aria-hidden="true" />
          <p className="text-muted mb-0">Loading your tickets…</p>
        </div>
      ) : !ticketData || ticketData.data.length === 0 ? (
        hasActiveFilters ? (
          <div className="text-center py-5 border rounded bg-light">
            <h4 className="fw-bold mb-2">No Matching Tickets</h4>
            <p className="text-muted mb-3">No tickets match your search or filter criteria.</p>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleClearFilters}>
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="text-center py-5 border rounded bg-light">
            <h4 className="fw-bold mb-2">No Tickets Created Yet</h4>
            <p className="text-muted mb-3">
              You haven't created any IT tickets yet. Click "+ Create Ticket" to get started.
            </p>
            <button type="button" className="btn zen-primary-button" onClick={onCreateTicket}>
              + Create Ticket
            </button>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle border mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" style={{ width: "160px" }}>
                    <button
                      type="button"
                      className="btn btn-link text-dark text-decoration-none p-0 fw-bold small"
                      onClick={() => handleSortToggle("ticketNumber")}
                    >
                      Ticket No. {sortBy === "ticketNumber" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th scope="col" style={{ width: "180px" }}>
                    <button
                      type="button"
                      className="btn btn-link text-dark text-decoration-none p-0 fw-bold small"
                      onClick={() => handleSortToggle("createdAt")}
                    >
                      Created Date {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th scope="col">Summary</th>
                  <th scope="col" style={{ width: "160px" }}>Category</th>
                  <th scope="col" style={{ width: "120px" }}>
                    <button
                      type="button"
                      className="btn btn-link text-dark text-decoration-none p-0 fw-bold small"
                      onClick={() => handleSortToggle("requestedPriority")}
                    >
                      Priority {sortBy === "requestedPriority" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th scope="col" style={{ width: "100px" }}>Status</th>
                  <th scope="col" style={{ width: "90px" }} className="text-center">Files</th>
                  <th scope="col" style={{ width: "90px" }} className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {ticketData.data.map((ticket: Ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong className="text-primary-green">{ticket.ticketNumber}</strong>
                    </td>
                    <td className="small text-muted">{formatDate(ticket.createdAt)}</td>
                    <td>
                      <div className="fw-semibold text-truncate" style={{ maxWidth: "320px" }}>
                        {ticket.summary}
                      </div>
                      <small className="text-muted">{ticket.relatedSystem?.name || ""}</small>
                    </td>
                    <td>
                      <span className="small">{ticket.category?.name || "N/A"}</span>
                    </td>
                    <td>{renderPriorityBadge(ticket.requestedPriority)}</td>
                    <td>
                      <span className="badge bg-success">{ticket.status}</span>
                    </td>
                    <td className="text-center">
                      {ticket.activeAttachmentCount && ticket.activeAttachmentCount > 0 ? (
                        <span className="badge bg-light text-dark border">
                          📎 {ticket.activeAttachmentCount}
                        </span>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onViewTicketDetail && onViewTicketDetail(ticket.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="d-md-none d-flex flex-column gap-3">
            {ticketData.data.map((ticket: Ticket) => (
              <div key={ticket.id} className="card p-3 border rounded">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <strong className="text-primary-green">{ticket.ticketNumber}</strong>
                  {renderPriorityBadge(ticket.requestedPriority)}
                </div>
                <h6 className="fw-bold mb-1">{ticket.summary}</h6>
                <p className="text-muted small mb-2">
                  {ticket.category?.name} · {ticket.relatedSystem?.name}
                </p>
                <div className="d-flex justify-content-between align-items-center text-muted small mt-2 pt-2 border-top">
                  <span>{formatDate(ticket.createdAt)}</span>
                  {ticket.activeAttachmentCount && ticket.activeAttachmentCount > 0 ? (
                    <span>📎 {ticket.activeAttachmentCount} files</span>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary ms-auto"
                    onClick={() => onViewTicketDetail && onViewTicketDetail(ticket.id)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-4 pt-3 border-top">
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted">Page Size:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "75px" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={8}>8</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="small text-muted ms-2">
                Showing {Math.min((page - 1) * pageSize + 1, ticketData.pagination.totalItems)} to{" "}
                {Math.min(page * pageSize, ticketData.pagination.totalItems)} of{" "}
                {ticketData.pagination.totalItems} tickets
              </span>
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="small px-2">
                Page {ticketData.pagination.page} of {ticketData.pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= ticketData.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
