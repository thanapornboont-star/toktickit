import { useState, useEffect, useCallback } from "react";
import { DevRequester, AuthUser, RequesterDashboardData, getRequesterDashboard } from "../api.js";

export interface RequesterDashboardProps {
  requester?: DevRequester;
  authUser?: AuthUser;
  onViewTicket?: (ticketId: number) => void;
  onCreateTicket?: () => void;
  onNavigateMyTickets?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting on Me",
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

export function RequesterDashboard({
  requester,
  authUser,
  onViewTicket,
  onCreateTicket,
  onNavigateMyTickets,
}: RequesterDashboardProps) {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = authUser?.name ?? requester?.name ?? "User";

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await getRequesterDashboard();
      setData(result);
    } catch (err: any) {
      setError(err?.message || "Failed to load requester dashboard.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const metrics = data?.metrics;
  const recentTickets = data?.recentTickets ?? [];
  const isCompletelyEmpty = (metrics?.totalOpen ?? 0) === 0 && recentTickets.length === 0;

  return (
    <div className="container-fluid px-3 py-4" data-testid="requester-dashboard">
      {/* 4.1 Header & Personal Summary */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark">
            Welcome, {displayName}!
          </h1>
          <p className="text-muted mb-0">
            Here's the latest on your requests.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => void fetchDashboardData(true)}
            disabled={isLoading || isRefreshing}
            data-testid="refresh-requester-dashboard-btn"
            aria-label="Refresh dashboard"
          >
            <span
              className={`spinner-border spinner-border-sm ${isRefreshing ? "" : "d-none"}`}
              role="status"
              aria-hidden="true"
            />
            <span>{isRefreshing ? "Refreshing..." : "↻ Refresh"}</span>
          </button>
          {onCreateTicket && (
            <button
              type="button"
              className="btn btn-success"
              onClick={onCreateTicket}
              data-testid="dashboard-create-ticket-btn"
            >
              + Create Ticket
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => void fetchDashboardData()}
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-5" data-testid="requester-dashboard-loading">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading your ticket summary...</span>
          </div>
          <p className="text-muted mt-2">Loading your requests...</p>
        </div>
      ) : (
        <>
          {/* 4.2 Personal Ticket Metric Cards */}
          <div className="row g-3 mb-4" data-testid="requester-metric-cards">
            {/* Total Open */}
            <div className="col-12 col-sm-6 col-md-3">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer"
                onClick={onNavigateMyTickets}
                data-testid="metric-card-total-open"
                role="button"
                tabIndex={0}
                aria-label={`My open tickets: ${metrics?.totalOpen ?? 0}`}
              >
                <div className="card-body p-3">
                  <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                    My Open Tickets
                  </span>
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="h2 mb-0 fw-bold text-primary">
                      {metrics?.totalOpen ?? 0}
                    </span>
                    <span className="badge bg-primary-subtle text-primary border">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="col-12 col-sm-6 col-md-3">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer"
                onClick={onNavigateMyTickets}
                data-testid="metric-card-in-progress"
                role="button"
                tabIndex={0}
                aria-label={`In progress tickets: ${metrics?.inProgress ?? 0}`}
              >
                <div className="card-body p-3">
                  <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                    In Progress
                  </span>
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="h2 mb-0 fw-bold text-warning">
                      {metrics?.inProgress ?? 0}
                    </span>
                    <span className="badge bg-warning-subtle text-warning border">Working</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Waiting on Me */}
            <div className="col-12 col-sm-6 col-md-3">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer"
                onClick={onNavigateMyTickets}
                data-testid="metric-card-waiting"
                role="button"
                tabIndex={0}
                aria-label={`Waiting on me tickets: ${metrics?.waitingForRequester ?? 0}`}
              >
                <div className="card-body p-3">
                  <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                    Waiting on Me
                  </span>
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="h2 mb-0 fw-bold text-danger">
                      {metrics?.waitingForRequester ?? 0}
                    </span>
                    <span className="badge bg-danger-subtle text-danger border">Action Needed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recently Resolved */}
            <div className="col-12 col-sm-6 col-md-3">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer"
                onClick={onNavigateMyTickets}
                data-testid="metric-card-resolved"
                role="button"
                tabIndex={0}
                aria-label={`Recently resolved tickets: ${metrics?.recentlyResolved ?? 0}`}
              >
                <div className="card-body p-3">
                  <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                    Recently Resolved
                  </span>
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="h2 mb-0 fw-bold text-success">
                      {metrics?.recentlyResolved ?? 0}
                    </span>
                    <span className="badge bg-success-subtle text-success border">Past 7 Days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4.3 My Recent Tickets & Action Shortcuts */}
          <div className="card border-0 shadow-sm" data-testid="requester-recent-tickets-section">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0 fw-bold">Recent Ticket Updates</h2>
              {onNavigateMyTickets && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={onNavigateMyTickets}
                  data-testid="view-all-my-tickets-btn"
                >
                  View All My Tickets →
                </button>
              )}
            </div>
            <div className="card-body p-0">
              {recentTickets.length === 0 ? (
                <div className="text-center py-5 px-3" data-testid="empty-requester-tickets">
                  <div className="mb-3 text-muted fs-1" aria-hidden="true">🎫</div>
                  <h3 className="h5 fw-bold text-dark mb-2">You haven't submitted any tickets yet</h3>
                  <p className="text-muted mb-4 max-w-md mx-auto">
                    Have an IT issue, equipment need, or system inquiry? Submit a ticket and our support team will assist you.
                  </p>
                  {onCreateTicket && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={onCreateTicket}
                      data-testid="empty-state-create-ticket-btn"
                    >
                      Submit Your First Ticket
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" style={{ width: "160px" }}>Ticket #</th>
                        <th scope="col">Summary</th>
                        <th scope="col" style={{ width: "140px" }}>Status</th>
                        <th scope="col" style={{ width: "180px" }}>Last Activity</th>
                        <th scope="col" style={{ width: "90px" }} className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTickets.map((t) => (
                        <tr
                          key={t.id}
                          className="cursor-pointer"
                          onClick={() => onViewTicket?.(t.id)}
                          data-testid={`requester-recent-ticket-row-${t.id}`}
                        >
                          <td>
                            <strong className="text-success">{t.ticketNumber}</strong>
                          </td>
                          <td>
                            <span className="fw-semibold text-dark">{t.summary}</span>
                          </td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[t.status] ?? "bg-secondary"}`}>
                              {STATUS_LABELS[t.status] ?? t.status}
                            </span>
                          </td>
                          <td>
                            <small className="text-muted">
                              {new Date(t.updatedAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </small>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewTicket?.(t.id);
                              }}
                              data-testid={`requester-view-ticket-btn-${t.id}`}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
