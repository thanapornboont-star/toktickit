import { useCallback, useEffect, useState } from "react";
import {
  AuthUser,
  StaffTicketDetail as StaffTicketDetailType,
  StaffMember,
  PublicCommentItem,
  InternalNoteItem,
  getStaffTicketDetail,
  getStaffMembers,
  updateTicketOwner,
  updateTicketPriority,
  updateTicketStatus,
  getPublicComments,
  createPublicComment,
  getInternalNotes,
  createInternalNote,
} from "../api.js";

const PERMITTED_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

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

export function StaffTicketDetail({
  authUser,
  ticketId,
  onBack,
}: {
  authUser: AuthUser;
  ticketId: number;
  onBack: () => void;
}) {
  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [comments, setComments] = useState<PublicCommentItem[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNoteItem[]>([]);

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");
  const [actionErrorMsg, setActionErrorMsg] = useState("");

  // Controls state
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedNextStatus, setSelectedNextStatus] = useState<string>("");

  // Comment inputs
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Internal note inputs
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  const loadData = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg("");
    try {
      const [ticketData, membersData, commentsData, notesData] = await Promise.all([
        getStaffTicketDetail(ticketId),
        getStaffMembers(),
        getPublicComments(ticketId),
        getInternalNotes(ticketId),
      ]);

      setTicket(ticketData);
      setStaffMembers(membersData);
      setComments(commentsData);
      setInternalNotes(notesData);

      setSelectedOwnerId(ticketData.owner ? String(ticketData.owner.id) : "");
      setSelectedPriority(ticketData.itPriority);

      const nextStatuses = PERMITTED_STATUS_TRANSITIONS[ticketData.status] ?? [];
      setSelectedNextStatus(nextStatuses[0] ?? "");

      setLoadState("ready");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load ticket details.");
      setLoadState("error");
    }
  }, [ticketId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Owner Claim / Reassign
  const handleClaim = async () => {
    setActionSuccessMsg("");
    setActionErrorMsg("");
    try {
      const updated = await updateTicketOwner(ticketId, authUser.id);
      setTicket((prev) => (prev ? { ...prev, ownerId: updated.ownerId, owner: updated.owner as any } : null));
      setSelectedOwnerId(String(authUser.id));
      setActionSuccessMsg(`Ticket assigned to you (${authUser.name}).`);
    } catch (err: any) {
      setActionErrorMsg(err?.message || "Failed to claim ticket.");
    }
  };

  const handleOwnerChange = async (newOwnerIdStr: string) => {
    setActionSuccessMsg("");
    setActionErrorMsg("");
    try {
      const ownerId = newOwnerIdStr === "" ? null : Number(newOwnerIdStr);
      const updated = await updateTicketOwner(ticketId, ownerId);
      setTicket((prev) => (prev ? { ...prev, ownerId: updated.ownerId, owner: updated.owner as any } : null));
      setSelectedOwnerId(newOwnerIdStr);
      setActionSuccessMsg(
        ownerId === null
          ? "Ticket unassigned."
          : `Ticket assigned to ${updated.owner?.name ?? "staff member"}.`
      );
    } catch (err: any) {
      setActionErrorMsg(err?.message || "Failed to update owner.");
    }
  };

  // Handle Priority Change
  const handlePriorityChange = async (newPriority: string) => {
    if (!["LOW", "MEDIUM", "HIGH"].includes(newPriority)) return;
    setActionSuccessMsg("");
    setActionErrorMsg("");
    try {
      const updated = await updateTicketPriority(ticketId, newPriority as "LOW" | "MEDIUM" | "HIGH");
      setTicket((prev) => (prev ? { ...prev, itPriority: updated.itPriority as any } : null));
      setSelectedPriority(updated.itPriority);
      setActionSuccessMsg(`IT Priority updated to ${updated.itPriority}.`);
    } catch (err: any) {
      setActionErrorMsg(err?.message || "Failed to update IT Priority.");
    }
  };

  // Handle Status Transition
  const handleStatusTransition = async () => {
    if (!selectedNextStatus) return;
    setActionSuccessMsg("");
    setActionErrorMsg("");
    try {
      const updated = await updateTicketStatus(ticketId, selectedNextStatus);
      setTicket((prev) => (prev ? { ...prev, status: updated.status } : null));

      const nextTransitions = PERMITTED_STATUS_TRANSITIONS[updated.status] ?? [];
      setSelectedNextStatus(nextTransitions[0] ?? "");
      setActionSuccessMsg(`Ticket status updated to ${STATUS_LABELS[updated.status] ?? updated.status}.`);
    } catch (err: any) {
      setActionErrorMsg(err?.message || "Failed to update status.");
    }
  };

  // Handle Public Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      setCommentError("Comment cannot exceed 2000 characters.");
      return;
    }

    setCommentError("");
    setIsSubmittingComment(true);
    try {
      const added = await createPublicComment(ticketId, trimmed);
      setComments((prev) => [...prev, added.comment]);
      setNewComment("");
    } catch (err: any) {
      setCommentError(err?.message || "Failed to submit comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNote.trim();
    if (!trimmed) {
      setNoteError("Internal note cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      setNoteError("Internal note cannot exceed 2000 characters.");
      return;
    }

    setNoteError("");
    setIsSubmittingNote(true);
    try {
      const added = await createInternalNote(ticketId, trimmed);
      setInternalNotes((prev) => [...prev, added]);
      setNewNote("");
    } catch (err: any) {
      setNoteError(err?.message || "Failed to submit internal note.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (loadState === "loading") {
    return (
      <section className="zen-card text-center py-5" role="status" aria-live="polite">
        <div className="spinner-border text-success" aria-hidden="true" />
        <p className="mt-2 text-muted">Loading ticket details…</p>
      </section>
    );
  }

  if (loadState === "error" || !ticket) {
    return (
      <section className="zen-card" role="alert">
        <h2>Error Loading Ticket</h2>
        <div className="alert alert-danger">{errorMsg}</div>
        <button type="button" className="btn zen-primary-button" onClick={onBack}>
          ← Back to Queue
        </button>
      </section>
    );
  }

  const permittedTransitions = PERMITTED_STATUS_TRANSITIONS[ticket.status] ?? [];
  const isTerminalState = permittedTransitions.length === 0;
  const isAssignedToCurrent = ticket.owner?.id === authUser.id;

  return (
    <div className="staff-ticket-detail">
      {/* Top action bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onBack}
          aria-label="Back to ticket queue"
        >
          ← Back to Queue
        </button>
        <span className="text-muted small">
          Last Updated: {new Date(ticket.updatedAt).toLocaleString()}
        </span>
      </div>

      {actionSuccessMsg && (
        <div className="alert alert-success py-2 mb-3" role="status">
          {actionSuccessMsg}
        </div>
      )}
      {actionErrorMsg && (
        <div className="alert alert-danger py-2 mb-3" role="alert">
          {actionErrorMsg}
        </div>
      )}

      {/* Ticket Header & Status Badges */}
      <section className="zen-card mb-4" aria-labelledby="detail-title">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <code className="text-muted small">{ticket.ticketNumber}</code>
            <h1 id="detail-title" className="h3 mb-1 mt-1">
              {ticket.summary}
            </h1>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className={`badge badge-status-${ticket.status.toLowerCase().replace(/_/g, "")}`}>
              {STATUS_LABELS[ticket.status] ?? ticket.status}
            </span>
            <span className={`badge badge-priority-${ticket.itPriority.toLowerCase()}`}>
              IT Priority: {ticket.itPriority}
            </span>
          </div>
        </div>

        {ticket.requesterIndicatedResolved && (
          <div className="alert alert-info py-2 mb-3 d-flex align-items-center gap-2" role="status">
            <span>✓</span>
            <strong>Requester has indicated that this problem appears resolved.</strong>
          </div>
        )}

        <div className="row g-3 py-2 border-top border-bottom my-2">
          <div className="col-12 col-md-4">
            <span className="text-muted small d-block">Requester</span>
            <strong>{ticket.requester?.name ?? "—"}</strong>
            <span className="text-muted small d-block">{ticket.requester?.email}</span>
          </div>
          <div className="col-6 col-md-4">
            <span className="text-muted small d-block">Category</span>
            <strong>{ticket.category?.name ?? "—"}</strong>
          </div>
          <div className="col-6 col-md-4">
            <span className="text-muted small d-block">Related System</span>
            <strong>{ticket.relatedSystem?.name ?? "—"}</strong>
          </div>
        </div>

        <div className="mt-3">
          <h2 className="h6 text-muted mb-1">Description</h2>
          <p className="ticket-description mb-0" style={{ whiteSpace: "pre-wrap" }}>
            {ticket.description}
          </p>
        </div>

        {/* Attachments */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="mt-3 pt-3 border-top">
            <h2 className="h6 text-muted mb-2">Attachments ({ticket.attachments.length})</h2>
            <ul className="list-unstyled mb-0 d-flex flex-wrap gap-2">
              {ticket.attachments.map((att) => (
                <li key={att.id} className="badge bg-light text-dark border p-2">
                  📎 {att.originalFilename} ({(att.fileSize / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Operational Controls: Owner, Priority, Status */}
      <section className="zen-card mb-4" aria-labelledby="controls-title">
        <h2 id="controls-title" className="h5 mb-3">
          Operational Controls
        </h2>

        <div className="row g-3">
          {/* Owner Assignment */}
          <div className="col-12 col-md-4">
            <label htmlFor="owner-select" className="form-label fw-semibold">
              Owner Assignment
            </label>
            <div className="d-flex gap-2">
              <select
                id="owner-select"
                className="form-select"
                value={selectedOwnerId}
                onChange={(e) => void handleOwnerChange(e.target.value)}
                aria-label="Assign ticket owner"
              >
                <option value="">Unassigned</option>
                {staffMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
              {!isAssignedToCurrent && (
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm text-nowrap"
                  onClick={() => void handleClaim()}
                  aria-label="Claim ticket"
                >
                  Claim
                </button>
              )}
            </div>
            <span className="form-text small">
              Current: {ticket.owner ? ticket.owner.name : <em className="text-muted">Unassigned</em>}
            </span>
          </div>

          {/* IT Priority */}
          <div className="col-12 col-md-4">
            <label htmlFor="priority-select" className="form-label fw-semibold">
              IT Priority
            </label>
            <select
              id="priority-select"
              className="form-select"
              value={selectedPriority}
              onChange={(e) => void handlePriorityChange(e.target.value)}
              aria-label="Update IT Priority"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <span className="form-text small">Requested: {ticket.requestedPriority}</span>
          </div>

          {/* Permitted Status Transition */}
          <div className="col-12 col-md-4">
            <label htmlFor="status-select" className="form-label fw-semibold">
              Status Transition
            </label>
            {isTerminalState ? (
              <p className="text-muted small mb-0 mt-2">
                🔒 Terminal state (<em>{ticket.status}</em>). No further transitions allowed.
              </p>
            ) : (
              <div className="d-flex gap-2">
                <select
                  id="status-select"
                  className="form-select"
                  value={selectedNextStatus}
                  onChange={(e) => setSelectedNextStatus(e.target.value)}
                  aria-label="Select next status"
                >
                  {permittedTransitions.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABELS[st] ?? st}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn zen-primary-button btn-sm text-nowrap"
                  onClick={() => void handleStatusTransition()}
                  disabled={!selectedNextStatus}
                  aria-label="Update status"
                >
                  Update
                </button>
              </div>
            )}
            <span className="form-text small">
              Allowed transitions from {ticket.status}:{" "}
              {isTerminalState ? "None" : permittedTransitions.join(", ")}
            </span>
          </div>
        </div>
      </section>

      {/* Communications: Public Comments vs Internal Notes */}
      <div className="row g-4 mb-4">
        {/* Public Comments Section */}
        <div className="col-12 col-lg-6">
          <section className="zen-card h-100" aria-labelledby="public-comments-heading">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 id="public-comments-heading" className="h5 mb-0">
                💬 Public Comments
              </h2>
              <span className="badge bg-light text-dark border small">Visible to Requester</span>
            </div>
            <p className="text-muted small mb-3">
              Messages shared transparently between requester and IT staff.
            </p>

            <div
              className="comments-list mb-3"
              style={{ maxHeight: "350px", overflowY: "auto" }}
              aria-label="Public comments list"
            >
              {comments.length === 0 ? (
                <p className="text-muted small fst-italic">No public comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-bubble p-2 mb-2 rounded border bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold small">{comment.author.name}</span>
                      <span className="badge bg-secondary small">{comment.author.role}</span>
                    </div>
                    <p className="mb-1 small" style={{ whiteSpace: "pre-wrap" }}>
                      {comment.content}
                    </p>
                    <time className="text-muted x-small d-block text-end">
                      {new Date(comment.createdAt).toLocaleString()}
                    </time>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={(e) => void handleAddComment(e)} aria-label="Add public comment">
              {commentError && (
                <div className="alert alert-danger py-1 small mb-2">{commentError}</div>
              )}
              <div className="mb-2">
                <label htmlFor="public-comment-input" className="visually-hidden">
                  Add a public comment
                </label>
                <textarea
                  id="public-comment-input"
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder="Write a public comment for the requester…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted x-small">{newComment.length} / 2000</span>
                <button
                  type="submit"
                  className="btn btn-outline-success btn-sm"
                  disabled={isSubmittingComment || !newComment.trim()}
                >
                  {isSubmittingComment ? "Posting…" : "Post Comment"}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Internal Notes Section (DISTINCT VISUAL STYLING: Amber / Yellow with Lock icon) */}
        <div className="col-12 col-lg-6">
          <section
            className="zen-card h-100 border-warning"
            style={{ backgroundColor: "#fffdf5" }}
            aria-labelledby="internal-notes-heading"
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 id="internal-notes-heading" className="h5 mb-0 text-dark">
                🔒 Internal Notes
              </h2>
              <span className="badge bg-warning text-dark fw-bold">Confidential — Staff Only</span>
            </div>
            <p className="text-muted small mb-3">
              Private notes strictly hidden from requesters. Only visible to IT Staff and Admins.
            </p>

            <div
              className="internal-notes-list mb-3"
              style={{ maxHeight: "350px", overflowY: "auto" }}
              aria-label="Internal notes list"
            >
              {internalNotes.length === 0 ? (
                <p className="text-muted small fst-italic">No internal notes yet.</p>
              ) : (
                internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="note-bubble p-2 mb-2 rounded border border-warning bg-light"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold small">{note.author.name}</span>
                      <span className="badge bg-warning text-dark small">{note.author.role}</span>
                    </div>
                    <p className="mb-1 small" style={{ whiteSpace: "pre-wrap" }}>
                      {note.content}
                    </p>
                    <time className="text-muted x-small d-block text-end">
                      {new Date(note.createdAt).toLocaleString()}
                    </time>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={(e) => void handleAddNote(e)} aria-label="Add internal note">
              {noteError && (
                <div className="alert alert-danger py-1 small mb-2">{noteError}</div>
              )}
              <div className="mb-2">
                <label htmlFor="internal-note-input" className="visually-hidden">
                  Add an internal note
                </label>
                <textarea
                  id="internal-note-input"
                  className="form-control form-control-sm border-warning"
                  rows={3}
                  placeholder="Record confidential diagnosis, IP addresses, logs, or triage notes…"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted x-small">{newNote.length} / 2000</span>
                <button
                  type="submit"
                  className="btn btn-warning btn-sm text-dark fw-semibold"
                  disabled={isSubmittingNote || !newNote.trim()}
                >
                  {isSubmittingNote ? "Adding Note…" : "Add Internal Note"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
