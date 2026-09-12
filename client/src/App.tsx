import { useCallback, useEffect, useState } from "react";
import {
  clearStoredDevRequester,
  DevRequester,
  getDevRequesters,
  getStoredDevRequester,
  storeDevRequester,
  AuthUser,
  getStoredAuth,
  storeAuth,
  clearStoredAuth,
  logout,
} from "./api.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { TicketDetail } from "./components/TicketDetail.js";
import "./App.css";

type LoadState = "loading" | "ready" | "error";
type View = "my-tickets" | "create-ticket" | "ticket-detail" | "staff-queue" | "user-management";

function RequesterSelector({
  requesters,
  onContinue,
  onGoToLogin,
}: {
  requesters: DevRequester[];
  onContinue: (requester: DevRequester) => void;
  onGoToLogin?: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selectedRequester = requesters.find(
    (requester) => requester.id === Number(selectedId)
  );

  return (
    <main className="selector-page">
      <section className="selector-card" aria-labelledby="selector-title">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <p className="eyebrow mb-0">TokTickIT · Lab 2</p>
          {onGoToLogin && (
            <button
              type="button"
              className="btn btn-outline-success btn-sm"
              onClick={onGoToLogin}
            >
              Sign In (Lab 3)
            </button>
          )}
        </div>
        <h1 id="selector-title">Development Requester Selection</h1>
        <p className="testing-notice" role="note">
          Choose a development requester to simulate the current requester context. This is for testing only and is not a login screen.
        </p>
        <label htmlFor="dev-requester" className="form-label fw-semibold">
          Development requester
        </label>
        <select
          id="dev-requester"
          className="form-select"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          aria-describedby="requester-help"
        >
          <option value="">Select a requester…</option>
          {requesters.map((requester) => (
            <option key={requester.id} value={requester.id}>
              {requester.name} — {requester.department}
            </option>
          ))}
        </select>
        <p id="requester-help" className="form-text">
          Only active seeded requesters are available.
        </p>
        <button
          type="button"
          className="btn zen-primary-button w-100 mt-3"
          disabled={!selectedRequester}
          onClick={() => selectedRequester && onContinue(selectedRequester)}
        >
          Continue
        </button>
      </section>
    </main>
  );
}

function RoleBadge({ role }: { role: AuthUser["role"] }) {
  switch (role) {
    case "REQUESTER":
      return <span className="badge badge-role-requester">Requester</span>;
    case "IT_STAFF":
      return <span className="badge badge-role-staff">IT Staff</span>;
    case "ADMINISTRATOR":
      return <span className="badge badge-role-admin">Administrator</span>;
    default:
      return <span className="badge bg-secondary">{role}</span>;
  }
}

export function ApplicationShell({
  requester,
  authUser,
  onChangeRequester,
  onLogout,
}: {
  requester?: DevRequester;
  authUser?: AuthUser;
  onChangeRequester?: () => void;
  onLogout?: () => void;
}) {
  const [activeView, setActiveView] = useState<View>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const effectiveRequester = authUser
    ? {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        department: "Requester",
        isActive: authUser.isActive,
      }
    : requester;

  const displayName = authUser ? authUser.name : requester ? requester.name : "";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isStaff = authUser?.role === "IT_STAFF";
  const isAdmin = authUser?.role === "ADMINISTRATOR";

  // Auto-set view for staff or admin
  useEffect(() => {
    if (isStaff) {
      setActiveView("staff-queue");
    } else if (isAdmin) {
      setActiveView("user-management");
    } else {
      setActiveView("my-tickets");
    }
  }, [isStaff, isAdmin]);

  return (
    <div className="app-page">
      <header className="app-header">
        <div className="app-header-content">
          <a
            className="brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              if (isStaff) setActiveView("staff-queue");
              else if (isAdmin) setActiveView("user-management");
              else setActiveView("my-tickets");
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              T
            </span>
            TokTickIT
          </a>

          <nav aria-label="Main navigation" className="main-nav">
            {!isStaff && !isAdmin && (
              <>
                <a
                  href="#my-tickets"
                  className={activeView === "my-tickets" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveView("my-tickets");
                  }}
                >
                  My Tickets
                </a>
                <a
                  href="#create-ticket"
                  className={activeView === "create-ticket" ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveView("create-ticket");
                  }}
                >
                  Create Ticket
                </a>
              </>
            )}

            {isStaff && (
              <a
                href="#staff-queue"
                className={activeView === "staff-queue" ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView("staff-queue");
                }}
              >
                Ticket Queue
              </a>
            )}

            {isAdmin && (
              <a
                href="#user-management"
                className={activeView === "user-management" ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView("user-management");
                }}
              >
                User Management
              </a>
            )}
          </nav>

          <div className="requester-controls">
            {authUser ? (
              <div className="d-flex align-items-center gap-2">
                <div
                  className="user-profile-pill"
                  aria-label={`Current user: ${authUser.name} (${authUser.role})`}
                >
                  <span className="avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <span className="fw-semibold me-1">{authUser.name}</span>
                  <RoleBadge role={authUser.role} />
                </div>
                {onLogout && (
                  <button
                    type="button"
                    className="btn btn-logout ms-2"
                    onClick={onLogout}
                    aria-label="Sign out"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : requester ? (
              <>
                <div
                  className="requester-badge"
                  aria-label={`Current requester: ${requester.name}`}
                >
                  <span className="avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <span>
                    <strong>{requester.name}</strong>
                    <small>{requester.department}</small>
                  </span>
                </div>
                {onChangeRequester && (
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm ms-2"
                    onClick={onChangeRequester}
                  >
                    Change Requester
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </header>

      {!authUser && (
        <aside className="shell-disclaimer" role="note">
          Development requester mode is a Lab 2 testing mechanism, not authentication.
        </aside>
      )}

      <main className="shell-content">
        {isStaff ? (
          <section className="zen-card">
            <h2>IT Staff Ticket Queue</h2>
            <p className="text-muted">Staff Ticket Queue operational view will be built in Work Item 5.</p>
          </section>
        ) : isAdmin ? (
          <section className="zen-card">
            <h2>Administrator User Management</h2>
            <p className="text-muted">User Management operational view will be built in Work Item 7.</p>
          </section>
        ) : activeView === "create-ticket" && effectiveRequester ? (
          <CreateTicket
            requester={effectiveRequester}
            onNavigateToMyTickets={() => setActiveView("my-tickets")}
          />
        ) : activeView === "ticket-detail" && selectedTicketId !== null && effectiveRequester ? (
          <TicketDetail
            requester={effectiveRequester}
            ticketId={selectedTicketId}
            onBack={() => setActiveView("my-tickets")}
          />
        ) : effectiveRequester ? (
          <MyTickets
            requester={effectiveRequester}
            onCreateTicket={() => setActiveView("create-ticket")}
            onViewTicketDetail={(ticketId) => {
              setSelectedTicketId(ticketId);
              setActiveView("ticket-detail");
            }}
          />
        ) : (
          <div className="alert alert-info">Welcome to TokTickIT.</div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<{ token: string; user: AuthUser } | null>(getStoredAuth);
  const [showLogin, setShowLogin] = useState<boolean>(() => {
    return window.location.hash === "#login";
  });

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<DevRequester[]>([]);
  const [currentRequester, setCurrentRequester] = useState<DevRequester | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRequesters = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage("");
    try {
      const activeRequesters = await getDevRequesters();
      setRequesters(activeRequesters);
      const storedRequester = getStoredDevRequester();
      const revalidatedRequester = activeRequesters.find(
        (requester) => requester.id === storedRequester?.id
      );
      if (revalidatedRequester) {
        setCurrentRequester(revalidatedRequester);
        storeDevRequester(revalidatedRequester);
      } else {
        clearStoredDevRequester();
        setCurrentRequester(null);
      }
      setLoadState("ready");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load requesters."
      );
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    // Only load dev requesters if not authenticated
    if (!auth) {
      void loadRequesters();
    }
  }, [auth, loadRequesters]);

  const handleLoginSuccess = (token: string, user: AuthUser) => {
    storeAuth(token, user);
    setAuth({ token, user });
    setShowLogin(false);
  };

  const handleLogout = async () => {
    if (auth) {
      await logout(auth.token);
    }
    clearStoredAuth();
    setAuth(null);
    setShowLogin(true);
  };

  const handlePasswordChanged = (updatedUser: AuthUser) => {
    if (auth) {
      storeAuth(auth.token, updatedUser);
      setAuth({ token: auth.token, user: updatedUser });
    }
  };

  function selectRequester(requester: DevRequester) {
    storeDevRequester(requester);
    setCurrentRequester(requester);
  }

  function changeRequester() {
    clearStoredDevRequester();
    setCurrentRequester(null);
  }

  // 1. Authenticated Mode
  if (auth) {
    // Mandatory first password change guard (BR-03)
    if (auth.user.mustChangePassword) {
      return (
        <ChangePassword
          token={auth.token}
          user={auth.user}
          onSuccess={handlePasswordChanged}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <ApplicationShell
        authUser={auth.user}
        onLogout={handleLogout}
      />
    );
  }

  // 2. Explicit Login Screen
  if (showLogin) {
    return (
      <Login
        onSuccess={handleLoginSuccess}
        onSelectDevRequester={() => setShowLogin(false)}
      />
    );
  }

  // 3. Dev Requester Loading / Fallback (Lab 2 compatibility until Work Item 4)
  if (loadState === "loading") {
    return (
      <main className="selector-page" aria-busy="true">
        <section className="selector-card text-center" role="status">
          <div className="spinner-border text-success mb-3" aria-hidden="true" />
          <h1>Loading development requesters…</h1>
          <p className="text-muted mb-0">Preparing the Lab 2 testing context.</p>
        </section>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="selector-page">
        <section className="selector-card" aria-labelledby="load-error-title">
          <p className="eyebrow">TokTickIT · Lab 2</p>
          <h1 id="load-error-title">Unable to load requesters</h1>
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
          <button
            type="button"
            className="btn zen-primary-button w-100"
            onClick={() => void loadRequesters()}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (requesters.length === 0) {
    return (
      <main className="selector-page">
        <section className="selector-card" aria-labelledby="empty-title">
          <p className="eyebrow">TokTickIT · Lab 2</p>
          <h1 id="empty-title">No active development requesters found</h1>
          <p className="text-muted">
            Ask the development team to seed an active requester, then try again.
          </p>
          <button
            type="button"
            className="btn zen-primary-button w-100"
            onClick={() => void loadRequesters()}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  return currentRequester ? (
    <ApplicationShell
      requester={currentRequester}
      onChangeRequester={changeRequester}
    />
  ) : (
    <RequesterSelector
      requesters={requesters}
      onContinue={selectRequester}
      onGoToLogin={() => setShowLogin(true)}
    />
  );
}
