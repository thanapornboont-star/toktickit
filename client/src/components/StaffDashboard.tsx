import { useState, useEffect, useCallback } from "react";
import { AuthUser, StaffDashboardData, getStaffDashboard } from "../api.js";

export interface StaffDashboardProps {
  authUser: AuthUser;
  onViewTicket?: (ticketId: number) => void;
  onNavigateQueue?: (filters?: { status?: string; itPriority?: string }) => void;
  onCreateTicket?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
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
  CRITICAL: "badge-priority-critical",
};

export function StaffDashboard({
  authUser,
  onViewTicket,
  onNavigateQueue,
  onCreateTicket,
}: StaffDashboardProps) {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await getStaffDashboard();
      setData(result);
    } catch (err: any) {
      setError(err?.message || "Failed to load staff dashboard.");
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

  return (
    <div className="container-fluid px-3 py-4" data-testid="staff-dashboard">
      {/* 3.1 Header & Quick Summary */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark">
            Welcome back, {authUser.name}!
          </h1>
          <p className="text-muted mb-0">
            Here's what's happening in your operational queue.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => void fetchDashboardData(true)}
            disabled={isLoading || isRefreshing}
            data-testid="refresh-dashboard-btn"
            aria-label="Refresh dashboard"
          >
            <span
              className={`spinner-border spinner-border-sm ${isRefreshing ? "" : "d-none"}`}
              role="status"
              aria-hidden="true"
            />
            <span>{isRefreshing ? "Refreshing..." : "↻ Refresh"}</span>
          </button>
          {onNavigateQueue && (
            <button
              type="button"
              className="btn btn-success"
              onClick={() => onNavigateQueue()}
              data-testid="nav-queue-btn"
            >
              Go to Ticket Queue
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
        <div className="text-center py-5" data-testid="dashboard-loading">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading dashboard metrics...</span>
          </div>
          <p className="text-muted mt-2">Loading operational metrics...</p>
        </div>
      ) : (
        <>
          {/* 3.2 Operational Metric Cards Grid */}
          <div className="row g-3 mb-4" data-testid="operational-metric-cards">
            {/* New */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer"
                onClick={() => onNavigateQueue?.({ status: "NEW" })}
                data-testid="metric-card-new"
                role="button"
                tabIndex={0}
                aria-label={`New tickets: ${metrics?.new ?? 0}`}
              >
                <div className="card-body p-3">
                  <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                    New
                  </span>
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="h2 mb-0 fw-bold text-primary">
                      {metrics?.new ?? 0}
                    </span>
                    <span className="badge bg-primary-subtle text-primary border">Fresh</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Open */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer"
                onClick={() => onNavigateQueue?.({ status: "OPEN" })}
                data-testid="metric-card-open"
                role="button"
                tabIndex={0}
                aria-label={`Open tickets: ${metrics?.open ?? 0}`}
              >
                <div className="card-body p-3">
                  <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                    Open
                  </span>
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="h2 mb-0 fw-bold text-info">
                      {metrics?.open ?? 0}
                    </span>
                    <span className="badge bg-info-subtle text-info border">Acknowledged</span>
                  </div>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer"
                onClick={() => onNavigateQueue?.({ status: "IN_PROGRESS" })}
                data-testid="metric-card-inprogress"
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
                    <span className="badge bg-warning-subtle text-warning border">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Waiting for Requester */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer"
                onClick={() => onNavigateQueue?.({ status: "WAITING_FOR_REQUESTER" })}
                data-testid="metric-card-waiting"
                role="button"
                tabIndex={0}
                aria-label={`Waiting for requester tickets: ${metrics?.waitingForRequester ?? 0}`}
              >
                <div className="card-body p-3">
                  <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                    Waiting for Requester
                  </span>
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="h2 mb-0 fw-bold text-secondary">
                      {metrics?.waitingForRequester ?? 0}
                    </span>
                    <span className="badge bg-secondary-subtle text-secondary border">Blocked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* My Assigned */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card h-100 border-0 shadow-sm metric-card cursor-pointer bg-light"
                onClick={() => onNavigateQueue?.()}
                data-testid="metric-card-myassigned"
                role="button"
                tabIndex={0}
                aria-label={`My assigned tickets: ${metrics?.myAssigned ?? 0}`}
              >
                <div className="card-body p-3">
                  <span className="text-success small fw-semibold text-uppercase d-block mb-1">
                    My Assigned
                  </span>
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="h2 mb-0 fw-bold text-success">
                      {metrics?.myAssigned ?? 0}
                    </span>
                    <span className="badge bg-success text-white">Owner</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Stats Row: Unassigned, Resolved, Priorities */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small d-block">Unassigned Queue</span>
                    <strong className="h4 mb-0 text-danger" data-testid="metric-unassigned">
                      {metrics?.unassigned ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Recently Resolved</span>
                    <strong className="h4 mb-0 text-success" data-testid="metric-resolved">
                      {metrics?.resolved ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Updated (24h)</span>
                    <strong className="h4 mb-0 text-dark" data-testid="metric-recent-updated">
                      {metrics?.recentlyUpdated ?? 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-8">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  <span className="text-muted small fw-semibold d-block mb-2">
                    Priority Breakdown (Active Queue)
                  </span>
                  <div className="d-flex flex-wrap gap-4 align-items-center" data-testid="priority-breakdown">
                    <div
                      className="d-flex align-items-center gap-2 cursor-pointer"
                      onClick={() => onNavigateQueue?.({ itPriority: "HIGH" })}
                      data-testid="priority-high-stat"
                    >
                      <span className="badge badge-priority-high">HIGH</span>
                      <strong className="fs-5">{metrics?.priorityCounts?.high ?? 0}</strong>
                    </div>
                    <div
                      className="d-flex align-items-center gap-2 cursor-pointer"
                      onClick={() => onNavigateQueue?.({ itPriority: "MEDIUM" })}
                      data-testid="priority-medium-stat"
                    >
                      <span className="badge badge-priority-medium">MEDIUM</span>
                      <strong className="fs-5">{metrics?.priorityCounts?.medium ?? 0}</strong>
                    </div>
                    <div
                      className="d-flex align-items-center gap-2 cursor-pointer"
                      onClick={() => onNavigateQueue?.({ itPriority: "LOW" })}
                      data-testid="priority-low-stat"
                    >
                      <span className="badge badge-priority-low">LOW</span>
                      <strong className="fs-5">{metrics?.priorityCounts?.low ?? 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.3 Recent & Urgent Tickets List */}
          <div className="card border-0 shadow-sm" data-testid="recent-tickets-section">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0 fw-bold">Recent Tickets in Queue</h2>
              {onNavigateQueue && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={() => onNavigateQueue()}
                >
                  View All Tickets →
                </button>
              )}
            </div>
            <div className="card-body p-0">
              {recentTickets.length === 0 ? (
                <div className="text-center py-5 text-muted" data-testid="empty-recent-tickets">
                  <p className="mb-0">No recent tickets in queue.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" style={{ width: "160px" }}>Ticket #</th>
                        <th scope="col">Summary</th>
                        <th scope="col" style={{ width: "130px" }}>Status</th>
                        <th scope="col" style={{ width: "110px" }}>Priority</th>
                        <th scope="col" style={{ width: "160px" }}>Owner</th>
                        <th scope="col" style={{ width: "160px" }}>Updated</th>
                        <th scope="col" style={{ width: "90px" }} className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTickets.map((t) => (
                        <tr
                          key={t.id}
                          className="cursor-pointer"
                          onClick={() => onViewTicket?.(t.id)}
                          data-testid={`recent-ticket-row-${t.id}`}
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
                            <span className={`badge ${PRIORITY_BADGE[t.itPriority] ?? "bg-secondary"}`}>
                              {t.itPriority}
                            </span>
                          </td>
                          <td>
                            <span className="small text-muted">
                              {t.owner?.name ?? "Unassigned"}
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
                              data-testid={`view-ticket-btn-${t.id}`}
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
