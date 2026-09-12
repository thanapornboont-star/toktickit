import { useState, FormEvent } from "react";
import { AuthUser, changePassword, storeAuth } from "../api.js";

export interface ChangePasswordProps {
  token: string;
  user: AuthUser;
  onSuccess: (updatedUser: AuthUser) => void;
  onLogout: () => void;
}

export function ChangePassword({ token, user, onSuccess, onLogout }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const hasLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasUpperLower = hasUpper && hasLower;
  const hasNumberOrSpecial = /[0-9\W_]/.test(newPassword);
  const isPolicyMet = hasLength && hasUpperLower && hasNumberOrSpecial;

  const validate = (): boolean => {
    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (!isPolicyMet) {
      errors.newPassword = "Password does not meet all policy requirements.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirmation password is required.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await changePassword(token, {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      // Update stored auth with new user profile
      storeAuth(token, response.user);
      onSuccess(response.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to change password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="selector-page">
      <section className="selector-card zen-card" aria-labelledby="change-password-title">
        <p className="eyebrow">TokTickIT · Security Setup</p>
        <h1 id="change-password-title">Change Your Password</h1>
        <p className="testing-notice mb-3" role="note">
          You must change your initial password before accessing TokTickIT.
        </p>

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="current-password" className="form-label fw-semibold">
              Current (temporary) password
            </label>
            <input
              id="current-password"
              type={showPasswords ? "text" : "password"}
              className={`form-control ${fieldErrors.currentPassword ? "is-invalid" : ""}`}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (fieldErrors.currentPassword) {
                  setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
                }
              }}
              placeholder="Enter current password"
              disabled={isSubmitting}
            />
            {fieldErrors.currentPassword && (
              <div className="invalid-feedback" role="alert">
                {fieldErrors.currentPassword}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="new-password" className="form-label fw-semibold">
              New password
            </label>
            <input
              id="new-password"
              type={showPasswords ? "text" : "password"}
              className={`form-control ${fieldErrors.newPassword ? "is-invalid" : ""}`}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                }
              }}
              placeholder="Create new password"
              disabled={isSubmitting}
            />
            {fieldErrors.newPassword && (
              <div className="invalid-feedback" role="alert">
                {fieldErrors.newPassword}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="confirm-password" className="form-label fw-semibold">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showPasswords ? "text" : "password"}
              className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              placeholder="Confirm new password"
              disabled={isSubmitting}
            />
            {fieldErrors.confirmPassword && (
              <div className="invalid-feedback" role="alert">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          {/* Password Policy Checklist */}
          <div className="p-3 mb-3 bg-light rounded border text-start">
            <p className="small fw-bold mb-2 text-muted">Password must:</p>
            <ul className="list-unstyled small mb-0">
              <li className={`d-flex align-items-center mb-1 ${hasLength ? "text-success fw-bold" : "text-muted"}`}>
                <span className="me-2">{hasLength ? "✓" : "○"}</span>
                Be at least 8 characters
              </li>
              <li className={`d-flex align-items-center mb-1 ${hasUpperLower ? "text-success fw-bold" : "text-muted"}`}>
                <span className="me-2">{hasUpperLower ? "✓" : "○"}</span>
                Include uppercase and lowercase letters
              </li>
              <li className={`d-flex align-items-center ${hasNumberOrSpecial ? "text-success fw-bold" : "text-muted"}`}>
                <span className="me-2">{hasNumberOrSpecial ? "✓" : "○"}</span>
                Include a number and a special character
              </li>
            </ul>
          </div>

          <div className="mb-3 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="show-passwords-toggle"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="show-passwords-toggle">
              Show passwords
            </label>
          </div>

          <button
            type="submit"
            className="btn zen-primary-button w-100 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Updating password...
              </>
            ) : (
              "Continue"
            )}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary w-100 mt-2"
            onClick={onLogout}
            disabled={isSubmitting}
          >
            Cancel & Sign Out
          </button>
        </form>
      </section>
    </main>
  );
}
