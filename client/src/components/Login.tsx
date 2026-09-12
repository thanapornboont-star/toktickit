import { useState, FormEvent } from "react";
import { AuthUser, login, storeAuth } from "../api.js";

export interface LoginProps {
  onSuccess: (token: string, user: AuthUser) => void;
  onSelectDevRequester?: () => void;
}

export function Login({ onSuccess, onSelectDevRequester }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email address is required.";
    }
    if (!password) {
      errors.password = "Password is required.";
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
      const response = await login(email.trim(), password);
      storeAuth(response.token, response.user);
      onSuccess(response.token, response.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="selector-page">
      <section className="selector-card zen-card" aria-labelledby="login-title">
        <p className="eyebrow">TokTickIT · Service Desk</p>
        <h1 id="login-title">Sign in to your account</h1>

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="login-email" className="form-label fw-semibold">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              placeholder="name@toktickit.local"
              autoComplete="email"
              disabled={isSubmitting}
            />
            {fieldErrors.email && (
              <div className="invalid-feedback" role="alert">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="login-password" className="form-label fw-semibold">
              Password
            </label>
            <div className="input-group">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="invalid-feedback d-block" role="alert">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn zen-primary-button w-100 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {onSelectDevRequester && (
          <div className="text-center mt-3 pt-3 border-top">
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none text-muted"
              onClick={onSelectDevRequester}
            >
              Development Requester Selector (Testing)
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
