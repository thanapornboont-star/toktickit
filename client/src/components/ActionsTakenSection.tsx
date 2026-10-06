import React, { useState, useEffect, useCallback } from "react";
import {
  ActionTakenItem,
  getActionsTaken,
  createActionTaken,
  updateActionTaken,
  AuthUser,
  DevRequester,
} from "../api.js";

interface ActionsTakenSectionProps {
  ticketId: number;
  currentUser?: AuthUser | DevRequester | null;
  isReadOnly?: boolean;
}

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function toLocalISOString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function ActionsTakenSection({
  ticketId,
  currentUser,
  isReadOnly: explicitReadOnly,
}: ActionsTakenSectionProps) {
  const [actions, setActions] = useState<ActionTakenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Determine read-only: explicitly passed or if user is not IT_STAFF / ADMINISTRATOR
  const userRole = (currentUser as AuthUser)?.role;
  const isStaffOrAdmin = userRole === "IT_STAFF" || userRole === "ADMINISTRATOR";
  const isReadOnly = explicitReadOnly !== undefined ? explicitReadOnly : !isStaffOrAdmin;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);

  // Form State
  const [formDateTime, setFormDateTime] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formResult, setFormResult] = useState("");
  const [formIsFollowUp, setFormIsFollowUp] = useState(false);
  const [formFollowUpNote, setFormFollowUpNote] = useState("");
  const [formAttachmentNotes, setFormAttachmentNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchActions = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const data = await getActionsTaken(ticketId);
      setActions(data.actions || []);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load actions taken.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const openCreateModal = () => {
    setEditingActionId(null);
    setFormDateTime(toLocalISOString(new Date()));
    setFormDescription("");
    setFormResult("");
    setFormIsFollowUp(false);
    setFormFollowUpNote("");
    setFormAttachmentNotes("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (action: ActionTakenItem) => {
    setEditingActionId(action.id);
    const date = action.actionDateTime ? new Date(action.actionDateTime) : new Date();
    setFormDateTime(toLocalISOString(date));
    setFormDescription(action.description);
    setFormResult(action.result);
    setFormIsFollowUp(action.isFollowUpRequired);
    setFormFollowUpNote(action.followUpNote || "");
    setFormAttachmentNotes(action.attachmentNotes || "");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingActionId(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formDescription.trim() || formDescription.trim().length < 3) {
      errors.description = "Action description must be at least 3 characters.";
    } else if (formDescription.trim().length > 2000) {
      errors.description = "Action description cannot exceed 2000 characters.";
    }

    if (!formResult.trim() || formResult.trim().length < 3) {
      errors.result = "Action result must be at least 3 characters.";
    } else if (formResult.trim().length > 2000) {
      errors.result = "Action result cannot exceed 2000 characters.";
    }

    if (formIsFollowUp) {
      if (!formFollowUpNote.trim() || formFollowUpNote.trim().length < 3) {
        errors.followUpNote = "Follow-up note is required (3–1000 characters).";
      } else if (formFollowUpNote.trim().length > 1000) {
        errors.followUpNote = "Follow-up note cannot exceed 1000 characters.";
      }
    }

    if (formDateTime) {
      const selected = new Date(formDateTime).getTime();
      const nowWithBuffer = Date.now() + 5 * 60 * 1000;
      if (selected > nowWithBuffer) {
        errors.actionDateTime = "Action date/time cannot be in the future beyond 5 minutes.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const payload = {
        actionDateTime: formDateTime ? new Date(formDateTime).toISOString() : new Date().toISOString(),
        description: formDescription.trim(),
        result: formResult.trim(),
        isFollowUpRequired: formIsFollowUp,
        followUpNote: formIsFollowUp ? formFollowUpNote.trim() : null,
        attachmentNotes: formAttachmentNotes.trim() ? formAttachmentNotes.trim() : null,
      };

      if (editingActionId) {
        await updateActionTaken(ticketId, editingActionId, payload);
        setSuccessMsg("Action taken updated successfully.");
      } else {
        await createActionTaken(ticketId, payload);
        setSuccessMsg("Action taken recorded successfully.");
      }

      closeModal();
      await fetchActions();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setFormErrors({ submit: err?.message || "Failed to save action taken." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="zen-card mb-4" data-testid="actions-taken-section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="h5 mb-0 d-inline-block me-2">Actions Taken</h3>
          <span className="badge bg-success" data-testid="actions-count-badge">
            {actions.length}
          </span>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={openCreateModal}
            data-testid="add-action-taken-btn"
          >
            + Add Action Taken
          </button>
        )}
      </div>

      {successMsg && (
        <div className="alert alert-success py-2 px-3 small" role="alert">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger py-2 px-3 small" role="alert">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-3 text-muted">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Loading actions taken...
        </div>
      ) : actions.length === 0 ? (
        <div className="text-center py-4 bg-light rounded text-muted">
          <p className="mb-0">No actions taken have been recorded yet.</p>
          {!isReadOnly && (
            <small>Click &quot;+ Add Action Taken&quot; to log work performed on this ticket.</small>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" data-testid="actions-taken-table">
            <thead className="table-light small">
              <tr>
                <th style={{ width: "16%" }}>Date / Time</th>
                <th style={{ width: "28%" }}>Description</th>
                <th style={{ width: "24%" }}>Result</th>
                <th style={{ width: "16%" }}>Performed By</th>
                <th style={{ width: "16%" }}>Follow-Up & Notes</th>
                {!isReadOnly && <th style={{ width: "8%" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {actions.map((act) => (
                <tr key={act.id} data-testid={`action-row-${act.id}`}>
                  <td className="small text-muted">{formatDateTime(act.actionDateTime)}</td>
                  <td>
                    <div className="text-wrap" style={{ whiteSpace: "pre-line" }}>
                      {act.description}
                    </div>
                  </td>
                  <td>
                    <div className="text-wrap" style={{ whiteSpace: "pre-line" }}>
                      {act.result}
                    </div>
                  </td>
                  <td>
                    <span className="fw-medium">{act.performedBy?.name || "IT Staff"}</span>
                    {act.performedBy?.role && (
                      <span className="badge bg-secondary ms-1 small">
                        {act.performedBy.role === "ADMINISTRATOR" ? "Admin" : "Staff"}
                      </span>
                    )}
                  </td>
                  <td>
                    {act.isFollowUpRequired ? (
                      <div>
                        <span className="badge bg-warning text-dark mb-1">Follow-up Required</span>
                        {act.followUpNote && (
                          <div
                            className="p-1 bg-light border-start border-warning border-2 small text-dark mt-1"
                            data-testid={`followup-note-${act.id}`}
                          >
                            <strong>Note:</strong> {act.followUpNote}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="badge bg-light text-muted border">No Follow-up</span>
                    )}
                    {act.attachmentNotes && (
                      <div className="text-muted small mt-1">
                        <i className="bi bi-paperclip me-1" />
                        Notes: {act.attachmentNotes}
                      </div>
                    )}
                  </td>
                  {!isReadOnly && (
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => openEditModal(act)}
                        data-testid={`edit-action-btn-${act.id}`}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="action-taken-modal"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingActionId ? "Edit Action Taken" : "Record Action Taken"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeModal}
                  disabled={isSubmitting}
                />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {/* Account attribution info notice */}
                  <div className="alert alert-info py-2 px-3 small mb-3">
                    Action will be recorded under your authenticated account:{" "}
                    <strong>{currentUser?.name || "IT Staff"}</strong>
                  </div>

                  {formErrors.submit && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      {formErrors.submit}
                    </div>
                  )}

                  {/* Action Date & Time */}
                  <div className="mb-3">
                    <label htmlFor="actionDateTimeInput" className="form-label small fw-semibold">
                      Action Date &amp; Time
                    </label>
                    <input
                      id="actionDateTimeInput"
                      type="datetime-local"
                      className={`form-control ${formErrors.actionDateTime ? "is-invalid" : ""}`}
                      value={formDateTime}
                      onChange={(e) => setFormDateTime(e.target.value)}
                    />
                    {formErrors.actionDateTime && (
                      <div className="invalid-feedback">{formErrors.actionDateTime}</div>
                    )}
                  </div>

                  {/* Action Description */}
                  <div className="mb-3">
                    <label htmlFor="actionDescriptionInput" className="form-label small fw-semibold">
                      Description of Action Taken <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="actionDescriptionInput"
                      className={`form-control ${formErrors.description ? "is-invalid" : ""}`}
                      rows={3}
                      placeholder="Detail the technical action taken, diagnostic procedures, or repairs performed..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                    {formErrors.description && (
                      <div className="invalid-feedback">{formErrors.description}</div>
                    )}
                  </div>

                  {/* Action Result */}
                  <div className="mb-3">
                    <label htmlFor="actionResultInput" className="form-label small fw-semibold">
                      Outcome / Result <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="actionResultInput"
                      className={`form-control ${formErrors.result ? "is-invalid" : ""}`}
                      rows={2}
                      placeholder="State the observed outcome or verification result..."
                      value={formResult}
                      onChange={(e) => setFormResult(e.target.value)}
                    />
                    {formErrors.result && (
                      <div className="invalid-feedback">{formErrors.result}</div>
                    )}
                  </div>

                  {/* Follow-up Required Checkbox */}
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isFollowUpRequiredCheckbox"
                      checked={formIsFollowUp}
                      onChange={(e) => setFormIsFollowUp(e.target.checked)}
                    />
                    <label
                      className="form-check-label fw-semibold small"
                      htmlFor="isFollowUpRequiredCheckbox"
                    >
                      Follow-up Required
                    </label>
                  </div>

                  {/* Follow-up Note (conditionally visible and required) */}
                  {formIsFollowUp && (
                    <div className="mb-3 p-3 bg-light border border-warning rounded">
                      <label htmlFor="followUpNoteInput" className="form-label small fw-semibold text-dark">
                        Follow-up Instructions / Note <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="followUpNoteInput"
                        className={`form-control ${formErrors.followUpNote ? "is-invalid" : ""}`}
                        rows={2}
                        placeholder="Specify required follow-up actions, timeframes, or monitoring steps..."
                        value={formFollowUpNote}
                        onChange={(e) => setFormFollowUpNote(e.target.value)}
                      />
                      {formErrors.followUpNote && (
                        <div className="invalid-feedback">{formErrors.followUpNote}</div>
                      )}
                    </div>
                  )}

                  {/* Attachment Notes */}
                  <div className="mb-3">
                    <label htmlFor="attachmentNotesInput" className="form-label small fw-semibold">
                      Attachment / Reference Notes (Optional)
                    </label>
                    <input
                      id="attachmentNotesInput"
                      type="text"
                      className="form-control"
                      placeholder="e.g. See ping_results.txt or switch eth0/14 telemetry"
                      value={formAttachmentNotes}
                      onChange={(e) => setFormAttachmentNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm"
                    disabled={isSubmitting}
                    data-testid="submit-action-taken-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          role="status"
                          aria-hidden="true"
                        />
                        Saving...
                      </>
                    ) : editingActionId ? (
                      "Update Action Taken"
                    ) : (
                      "Record Action Taken"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
