import React, { useCallback, useEffect, useState } from "react";
import {
  AttachmentItem,
  DevRequester,
  Ticket,
  downloadAttachment,
  getTicketById,
  removeAttachment,
  uploadAttachment,
} from "../api.js";

interface TicketDetailProps {
  requester: DevRequester;
  ticketId: number;
  onBack: () => void;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ACTIVE_ATTACHMENTS = 5;

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
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

function formatFileSize(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function renderPriorityBadge(priority: string) {
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
}

export function TicketDetail({ requester, ticketId, onBack }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");

  const [attachmentToRemove, setAttachmentToRemove] = useState<AttachmentItem | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const [downloadError, setDownloadError] = useState("");

  const fetchTicket = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");
      const data = await getTicketById(ticketId, requester.id);
      setTicket(data);
    } catch (err: any) {
      setLoadError(
        err.status === 404
          ? "This ticket was not found or is not owned by the current requester."
          : err.message || "Failed to load ticket details."
      );
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, requester.id]);

  useEffect(() => {
    void fetchTicket();
  }, [fetchTicket]);

  const activeAttachments = ticket?.attachments?.filter((a) => !a.isRemoved) ?? [];
  const removedAttachments = ticket?.attachments?.filter((a) => a.isRemoved) ?? [];

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setAttachmentError("");
    setUploadNotice("");
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setAttachmentError("Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAttachmentError("File size exceeds 5 MB limit.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setAttachmentError("");
    setUploadNotice("");
    try {
      await uploadAttachment(ticketId, selectedFile, requester.id);
      setSelectedFile(null);
      setUploadNotice("Attachment uploaded successfully.");
      await fetchTicket();
    } catch (err: any) {
      setAttachmentError(err.message || "Failed to upload attachment.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(attachment: AttachmentItem) {
    setDownloadError("");
    try {
      const blob = await downloadAttachment(ticketId, attachment.id, requester.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.originalFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err.message || "Failed to download attachment.");
    }
  }

  function openRemoveModal(attachment: AttachmentItem) {
    setAttachmentToRemove(attachment);
    setRemovalReason("");
    setRemovalError("");
  }

  function closeRemoveModal() {
    if (isRemoving) return;
    setAttachmentToRemove(null);
    setRemovalReason("");
    setRemovalError("");
  }

  async function handleConfirmRemove() {
    if (!attachmentToRemove) return;
    const trimmedReason = removalReason.trim();
    if (trimmedReason.length < 5) {
      setRemovalError("Reason must be at least 5 characters.");
      return;
    }

    setIsRemoving(true);
    setRemovalError("");
    try {
      await removeAttachment(ticketId, attachmentToRemove.id, trimmedReason, requester.id);
      setAttachmentToRemove(null);
      setRemovalReason("");
      await fetchTicket();
    } catch (err: any) {
      setRemovalError(err.message || "Failed to remove attachment.");
    } finally {
      setIsRemoving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="zen-card" aria-labelledby="ticket-detail-heading">
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-success mb-3" aria-hidden="true" />
          <p className="text-muted mb-0">Loading ticket details…</p>
        </div>
      </section>
    );
  }

  if (loadError || !ticket) {
    return (
      <section className="zen-card" aria-labelledby="ticket-detail-heading">
        <button type="button" className="btn btn-link p-0 mb-3 text-decoration-none" onClick={onBack}>
          ← Back to My Tickets
        </button>
        <div className="alert alert-danger" role="alert">
          {loadError || "Ticket not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="zen-card" aria-labelledby="ticket-detail-heading">
      <button type="button" className="btn btn-link p-0 mb-3 text-decoration-none" onClick={onBack}>
        ← Back to My Tickets
      </button>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <p className="eyebrow mb-1">Ticket Detail</p>
          <h2 id="ticket-detail-heading" className="mb-0 text-primary-green">
            {ticket.ticketNumber}
          </h2>
        </div>
        {renderPriorityBadge(ticket.requestedPriority)}
      </div>

      {/* Read-only ticket header fields */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <label className="form-label fw-semibold" htmlFor="detail-created">
            Date
          </label>
          <input
            id="detail-created"
            type="text"
            className="form-control zen-field-readonly"
            value={formatDateTime(ticket.createdAt)}
            readOnly
            disabled
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label fw-semibold" htmlFor="detail-requester">
            Requester
          </label>
          <input
            id="detail-requester"
            type="text"
            className="form-control zen-field-readonly"
            value={ticket.requester ? `${ticket.requester.name} (${ticket.requester.email})` : requester.name}
            readOnly
            disabled
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label fw-semibold" htmlFor="detail-category">
            Category
          </label>
          <input
            id="detail-category"
            type="text"
            className="form-control zen-field-readonly"
            value={ticket.category?.name || "N/A"}
            readOnly
            disabled
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label fw-semibold" htmlFor="detail-system">
            Related System
          </label>
          <input
            id="detail-system"
            type="text"
            className="form-control zen-field-readonly"
            value={ticket.relatedSystem?.name || "N/A"}
            readOnly
            disabled
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label fw-semibold" htmlFor="detail-status">
            Status
          </label>
          <input
            id="detail-status"
            type="text"
            className="form-control zen-field-readonly"
            value={ticket.status}
            readOnly
            disabled
          />
        </div>
        <div className="col-12">
          <label className="form-label fw-semibold" htmlFor="detail-summary">
            Summary
          </label>
          <textarea
            id="detail-summary"
            className="form-control zen-field-readonly"
            value={ticket.summary}
            readOnly
            disabled
            rows={2}
          />
        </div>
        <div className="col-12">
          <label className="form-label fw-semibold" htmlFor="detail-description">
            Description
          </label>
          <textarea
            id="detail-description"
            className="form-control zen-field-readonly"
            value={ticket.description}
            readOnly
            disabled
            rows={5}
          />
        </div>
      </div>

      {/* Attachments Section */}
      <div className="pt-4 border-top">
        <h3 className="h5 mb-3">Attachments</h3>

        {downloadError && (
          <div className="alert alert-danger" role="alert">
            {downloadError}
          </div>
        )}

        <h4 className="h6 fw-semibold">Active Attachments</h4>
        {activeAttachments.length === 0 ? (
          <p className="text-muted small">No active attachments.</p>
        ) : (
          <div className="table-responsive mb-3">
            <table className="table table-sm table-hover align-middle border mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Filename</th>
                  <th scope="col">File Size</th>
                  <th scope="col">Upload Date</th>
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeAttachments.map((attachment) => (
                  <tr key={attachment.id}>
                    <td className="text-truncate" style={{ maxWidth: "260px" }}>
                      📎 {attachment.originalFilename}
                    </td>
                    <td>{formatFileSize(attachment.fileSize)}</td>
                    <td className="small text-muted">{formatDateTime(attachment.createdAt)}</td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => void handleDownload(attachment)}
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => openRemoveModal(attachment)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {removedAttachments.length > 0 && (
          <>
            <h4 className="h6 fw-semibold">Removed Attachments</h4>
            <div className="table-responsive mb-3">
              <table className="table table-sm align-middle border mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Filename</th>
                    <th scope="col">File Size</th>
                    <th scope="col">Removed On</th>
                    <th scope="col">Removal Reason</th>
                    <th scope="col" className="text-end">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {removedAttachments.map((attachment) => (
                    <tr key={attachment.id} className="text-muted">
                      <td className="text-decoration-line-through text-truncate" style={{ maxWidth: "260px" }}>
                        📎 {attachment.originalFilename}
                      </td>
                      <td>{formatFileSize(attachment.fileSize)}</td>
                      <td className="small">
                        {attachment.removedAt ? formatDateTime(attachment.removedAt) : "—"}
                      </td>
                      <td>
                        <span className="badge bg-secondary">{attachment.removalReason}</span>
                      </td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-secondary" disabled>
                          Unavailable
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeAttachments.length < MAX_ACTIVE_ATTACHMENTS ? (
          <form onSubmit={handleUpload} className="p-3 bg-light rounded border">
            <label htmlFor="detail-attachment" className="form-label fw-semibold">
              + Upload Attachment
            </label>
            <div className="d-flex flex-wrap gap-2 align-items-start">
              <input
                id="detail-attachment"
                type="file"
                className="form-control"
                style={{ maxWidth: "320px" }}
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                aria-describedby="detail-file-help"
              />
              <button
                type="submit"
                className="btn zen-primary-button d-flex align-items-center gap-2"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <span>Upload</span>
                )}
              </button>
            </div>
            <p id="detail-file-help" className="form-text mb-1">
              Allowed formats: JPG, PNG, WEBP, PDF. Maximum size: 5 MB. Max {MAX_ACTIVE_ATTACHMENTS} active attachments.
            </p>
            {attachmentError && (
              <div className="text-danger small mt-1" role="alert">
                {attachmentError}
              </div>
            )}
            {uploadNotice && (
              <div className="text-success small mt-1" role="status">
                {uploadNotice}
              </div>
            )}
          </form>
        ) : (
          <p className="text-muted small mb-0">
            Maximum of {MAX_ACTIVE_ATTACHMENTS} active attachments reached. Remove one to upload another.
          </p>
        )}
      </div>

      {/* Soft Removal Confirmation Modal */}
      {attachmentToRemove && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-modal-title"
          style={{ backgroundColor: "rgba(26, 46, 38, 0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="remove-modal-title">
                  Are you sure you want to remove this attachment?
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeRemoveModal}
                  disabled={isRemoving}
                />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  <strong>{attachmentToRemove.originalFilename}</strong> will be soft-removed. It will remain visible
                  in the attachment list but can no longer be downloaded.
                </p>
                <label htmlFor="removal-reason" className="form-label fw-semibold">
                  Please provide a reason for removal (required, min 5 chars):
                </label>
                <textarea
                  id="removal-reason"
                  className={`form-control ${removalError ? "is-invalid" : ""}`}
                  rows={3}
                  value={removalReason}
                  onChange={(e) => {
                    setRemovalReason(e.target.value);
                    if (removalError) setRemovalError("");
                  }}
                  aria-required="true"
                  aria-describedby={removalError ? "removal-reason-error" : undefined}
                />
                {removalError && (
                  <div id="removal-reason-error" className="invalid-feedback d-block text-danger">
                    {removalError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeRemoveModal}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => void handleConfirmRemove()}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                      Removing…
                    </>
                  ) : (
                    "Confirm Removal"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
