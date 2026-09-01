import { useCallback, useEffect, useState } from "react";
import {
  clearStoredDevRequester,
  DevRequester,
  getDevRequesters,
  getStoredDevRequester,
  storeDevRequester,
} from "./api.js";
import { CreateTicket } from "./components/CreateTicket.js";
import "./App.css";

type LoadState = "loading" | "ready" | "error";
type View = "my-tickets" | "create-ticket";

function RequesterSelector({
  requesters,
  onContinue,
}: {
  requesters: DevRequester[];
  onContinue: (requester: DevRequester) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selectedRequester = requesters.find(
    (requester) => requester.id === Number(selectedId)
  );

  return (
    <main className="selector-page">
      <section className="selector-card" aria-labelledby="selector-title">
        <p className="eyebrow">TokTickIT · Lab 2</p>
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

function ApplicationShell({
  requester,
  onChangeRequester,
}: {
  requester: DevRequester;
  onChangeRequester: () => void;
}) {
  const [activeView, setActiveView] = useState<View>("create-ticket");
  const initials = requester.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-page">
      <header className="app-header">
        <div className="app-header-content">
          <a
            className="brand"
            href="#my-tickets"
            onClick={(e) => {
              e.preventDefault();
              setActiveView("my-tickets");
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              T
            </span>
            TokTickIT
          </a>
          <nav aria-label="Main navigation" className="main-nav">
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
          </nav>
          <div className="requester-controls">
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
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={onChangeRequester}
            >
              Change Requester
            </button>
          </div>
        </div>
      </header>
      <aside className="shell-disclaimer" role="note">
        Development requester mode is a Lab 2 testing mechanism, not authentication.
      </aside>
      <main className="shell-content">
        {activeView === "create-ticket" ? (
          <CreateTicket
            requester={requester}
            onNavigateToMyTickets={() => setActiveView("my-tickets")}
          />
        ) : (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <p className="eyebrow mb-1">Requester workspace</p>
                <h1 className="mb-0">My Tickets</h1>
              </div>
              <button
                type="button"
                className="btn zen-primary-button"
                onClick={() => setActiveView("create-ticket")}
              >
                + Create Ticket
              </button>
            </div>
            <p className="text-muted mb-0">
              Ticket listing will be available in the My Tickets increment.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<DevRequester[]>([]);
  const [currentRequester, setCurrentRequester] = useState<DevRequester | null>(
    null
  );
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
    void loadRequesters();
  }, [loadRequesters]);

  function selectRequester(requester: DevRequester) {
    storeDevRequester(requester);
    setCurrentRequester(requester);
  }

  function changeRequester() {
    clearStoredDevRequester();
    setCurrentRequester(null);
  }

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
    />
  );
}
