import React, { useEffect, useState } from "react";
import {
  Category,
  CreateTicketPayload,
  createTicket,
  DevRequester,
  getCategories,
  getRelatedSystems,
  RelatedSystem,
  Ticket,
  uploadAttachment,
} from "../api.js";

interface CreateTicketProps {
  requester: DevRequester;
  onNavigateToMyTickets: () => void;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function CreateTicket({ requester, onNavigateToMyTickets }: CreateTicketProps) {
  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefData, setLoadingRefData] = useState(true);
  const [refDataError, setRefDataError] = useState("");

  // Form values
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attachmentError, setAttachmentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadReferenceData() {
      try {
        setLoadingRefData(true);
        setRefDataError("");
        const [cats, systems] = await Promise.all([getCategories(), getRelatedSystems()]);
        if (isMounted) {
          setCategories(cats);
          setRelatedSystems(systems);
          setLoadingRefData(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setRefDataError(err.message || "Failed to load reference data.");
          setLoadingRefData(false);
        }
      }
    }
    void loadReferenceData();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setAttachmentError("");
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

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    const trimmedSummary = summary.trim();
    const trimmedDescription = description.trim();

    if (!trimmedSummary) {
      errors.summary = "Ticket summary is required.";
    } else if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.summary = "Summary must be between 5 and 100 characters.";
    }

    if (!trimmedDescription) {
      errors.description = "Ticket description is required.";
    } else if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters.";
    }

    if (!categoryId) {
      errors.categoryId = "Please select a Category.";
    }

    if (!relatedSystemId) {
      errors.relatedSystemId = "Please select a Related System.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setApiError("");
    setAttachmentNotice("");

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: CreateTicketPayload = {
        summary: summary.trim(),
        description: description.trim(),
        categoryId: parseInt(categoryId, 10),
        relatedSystemId: parseInt(relatedSystemId, 10),
        requestedPriority,
      };

      const ticket = await createTicket(payload, requester.id);

      // If file was attached, upload it
      if (selectedFile) {
        try {
          await uploadAttachment(ticket.id, selectedFile, requester.id);
        } catch (uploadErr: any) {
          setAttachmentNotice(
            "Ticket was created successfully, but attachment upload failed. You can add attachments from Ticket Details."
          );
        }
      }

      setCreatedTicket(ticket);
    } catch (err: any) {
      setApiError(err.message || "Failed to create ticket. Please check the form and try again.");
      if (err.details) {
        setFieldErrors(err.details);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setSummary("");
    setDescription("");
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("MEDIUM");
    setSelectedFile(null);
    setFieldErrors({});
    setAttachmentError("");
    setApiError("");
    setCreatedTicket(null);
    setAttachmentNotice("");
  }

  if (createdTicket) {
    return (
      <section className="zen-card success-card" aria-labelledby="success-title">
        <div className="success-header">
          <div className="success-icon" aria-hidden="true">✓</div>
          <div>
            <h2 id="success-title" className="mb-1 text-success">Ticket Created Successfully!</h2>
            <p className="text-muted mb-0">Your support request has been logged in the system.</p>
          </div>
        </div>

        <div className="ticket-confirmation-details mt-4 p-3 bg-light rounded border">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <span className="text-muted d-block small">Official Ticket Number:</span>
              <strong className="fs-5 text-primary-green">{createdTicket.ticketNumber}</strong>
            </div>
            <div className="col-12 col-md-6">
              <span className="text-muted d-block small">Status:</span>
              <span className="badge bg-success">{createdTicket.status}</span>
            </div>
            <div className="col-12">
              <span className="text-muted d-block small">Summary:</span>
              <strong>{createdTicket.summary}</strong>
            </div>
            <div className="col-12 col-md-6">
              <span className="text-muted d-block small">Category:</span>
              <span>{createdTicket.category?.name || "N/A"}</span>
            </div>
            <div className="col-12 col-md-6">
              <span className="text-muted d-block small">Related System:</span>
              <span>{createdTicket.relatedSystem?.name || "N/A"}</span>
            </div>
          </div>
        </div>

        {attachmentNotice && (
          <div className="alert alert-warning mt-3" role="status">
            {attachmentNotice}
          </div>
        )}

        <div className="mt-4 d-flex flex-wrap gap-3">
          <button
            type="button"
            className="btn zen-primary-button"
            onClick={onNavigateToMyTickets}
          >
            View in My Tickets
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleReset}
          >
            Create Another Ticket
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="zen-card" aria-labelledby="create-ticket-title">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <p className="eyebrow mb-1">Requester Portal</p>
          <h2 id="create-ticket-title" className="mb-0">Create IT Support Ticket</h2>
        </div>
      </div>

      {apiError && (
        <div className="alert alert-danger" role="alert">
          {apiError}
        </div>
      )}

      {refDataError && (
        <div className="alert alert-warning" role="alert">
          {refDataError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Read-Only Context Fields */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <label htmlFor="requester-readonly" className="form-label fw-semibold">
              Requester
            </label>
            <input
              id="requester-readonly"
              type="text"
              className="form-control zen-field-readonly"
              value={`${requester.name} (${requester.department})`}
              readOnly
              disabled
            />
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="requester-email" className="form-label fw-semibold">
              Requester Email
            </label>
            <input
              id="requester-email"
              type="text"
              className="form-control zen-field-readonly"
              value={requester.email}
              readOnly
              disabled
            />
          </div>
        </div>

        {/* Classification Fields */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <label htmlFor="category" className="form-label fw-semibold">
              Category <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <select
              id="category"
              className={`form-select ${fieldErrors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (fieldErrors.categoryId) {
                  setFieldErrors((prev) => ({ ...prev, categoryId: "" }));
                }
              }}
              disabled={loadingRefData}
              aria-required="true"
              aria-describedby={fieldErrors.categoryId ? "category-error" : undefined}
            >
              <option value="">Select a Category…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <div id="category-error" className="invalid-feedback d-block text-danger">
                {fieldErrors.categoryId}
              </div>
            )}
          </div>

          <div className="col-12 col-md-6">
            <label htmlFor="related-system" className="form-label fw-semibold">
              Related System <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <select
              id="related-system"
              className={`form-select ${fieldErrors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              onChange={(e) => {
                setRelatedSystemId(e.target.value);
                if (fieldErrors.relatedSystemId) {
                  setFieldErrors((prev) => ({ ...prev, relatedSystemId: "" }));
                }
              }}
              disabled={loadingRefData}
              aria-required="true"
              aria-describedby={fieldErrors.relatedSystemId ? "system-error" : undefined}
            >
              <option value="">Select a Related System…</option>
              {relatedSystems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name}
                </option>
              ))}
            </select>
            {fieldErrors.relatedSystemId && (
              <div id="system-error" className="invalid-feedback d-block text-danger">
                {fieldErrors.relatedSystemId}
              </div>
            )}
          </div>
        </div>

        {/* Priority Segmented Control */}
        <div className="mb-3">
          <label className="form-label fw-semibold d-block">
            Requested Priority <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <div className="btn-group w-100" role="group" aria-label="Requested Priority">
            {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn ${
                  requestedPriority === p
                    ? p === "HIGH"
                      ? "btn-danger"
                      : p === "MEDIUM"
                      ? "btn-warning"
                      : "btn-success"
                    : "btn-outline-secondary"
                }`}
                onClick={() => setRequestedPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Input */}
        <div className="mb-3">
          <div className="d-flex justify-content-between">
            <label htmlFor="summary" className="form-label fw-semibold">
              Ticket Summary <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <span className="text-muted small">{summary.length} / 100</span>
          </div>
          <input
            id="summary"
            type="text"
            className={`form-control ${fieldErrors.summary ? "is-invalid" : ""}`}
            placeholder="Brief description of the problem (e.g. Cannot connect to VPN)"
            value={summary}
            maxLength={100}
            onChange={(e) => {
              setSummary(e.target.value);
              if (fieldErrors.summary) {
                setFieldErrors((prev) => ({ ...prev, summary: "" }));
              }
            }}
            aria-required="true"
            aria-describedby={fieldErrors.summary ? "summary-error" : undefined}
          />
          {fieldErrors.summary && (
            <div id="summary-error" className="invalid-feedback d-block text-danger">
              {fieldErrors.summary}
            </div>
          )}
        </div>

        {/* Description Textarea */}
        <div className="mb-3">
          <div className="d-flex justify-content-between">
            <label htmlFor="description" className="form-label fw-semibold">
              Problem Description <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <span className="text-muted small">{description.length} / 2000</span>
          </div>
          <textarea
            id="description"
            rows={5}
            className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
            placeholder="Detailed description of the issue, error messages, and steps taken..."
            value={description}
            maxLength={2000}
            onChange={(e) => {
              setDescription(e.target.value);
              if (fieldErrors.description) {
                setFieldErrors((prev) => ({ ...prev, description: "" }));
              }
            }}
            aria-required="true"
            aria-describedby={fieldErrors.description ? "desc-error" : undefined}
          />
          {fieldErrors.description && (
            <div id="desc-error" className="invalid-feedback d-block text-danger">
              {fieldErrors.description}
            </div>
          )}
        </div>

        {/* Attachments Field */}
        <div className="mb-4">
          <label htmlFor="attachment" className="form-label fw-semibold">
            Supporting Attachment (Optional)
          </label>
          <input
            id="attachment"
            type="file"
            className="form-control"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileChange}
            aria-describedby="file-help"
          />
          <p id="file-help" className="form-text mb-1">
            Allowed formats: JPG, PNG, WEBP, PDF. Maximum size: 5 MB.
          </p>
          {attachmentError && (
            <div className="text-danger small mt-1" role="alert">
              {attachmentError}
            </div>
          )}
          {selectedFile && (
            <div className="d-flex align-items-center gap-2 mt-2 p-2 bg-light rounded border">
              <span className="small text-truncate flex-grow-1">
                📎 <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => setSelectedFile(null)}
                aria-label="Remove attachment"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="d-flex flex-wrap gap-3">
          <button
            type="submit"
            className="btn zen-primary-button d-flex align-items-center gap-2"
            disabled={isSubmitting || loadingRefData}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                <span>Submitting Ticket…</span>
              </>
            ) : (
              <span>Submit Ticket</span>
            )}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={isSubmitting}
            onClick={onNavigateToMyTickets}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
