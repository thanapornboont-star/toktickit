import React, { useCallback, useEffect, useState } from "react";
import {
  AdminUserItem,
  AuthUser,
  createAdminUser,
  getAdminUsers,
  resetUserPassword,
  updateAdminUser,
} from "../api.js";

interface UserManagementProps {
  authUser: AuthUser;
}

export function UserManagement({ authUser }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">(
    "REQUESTER"
  );
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createPassword, setCreatePassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">("REQUESTER");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Reset Password State
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data);
    } catch (err: any) {
      setStatusMessage({
        type: "danger",
        text: err.message || "Failed to load users.",
      });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditError(null);
    setResetPasswordVal("");
    setResetError(null);
    setResetSuccess(null);
  };

  // Close Edit Modal
  const handleCloseEdit = () => {
    setEditingUser(null);
    setEditError(null);
    setResetError(null);
    setResetSuccess(null);
  };

  // Submit Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    if (!createEmail.trim()) {
      setCreateError("Email is required.");
      return;
    }
    if (!createPassword) {
      setCreateError("Initial password is required.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const created = await createAdminUser({
        name: createName.trim(),
        email: createEmail.trim(),
        role: createRole,
        isActive: createIsActive,
        initialPassword: createPassword,
      });

      setShowCreateModal(false);
      setCreateName("");
      setCreateEmail("");
      setCreateRole("REQUESTER");
      setCreateIsActive(true);
      setCreatePassword("");
      setStatusMessage({
        type: "success",
        text: `User account for ${created.name} (${created.email}) created successfully.`,
      });
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create user.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Name is required.");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("Email is required.");
      return;
    }

    // Check self-deactivation attempt (BR-21, AC-20)
    if (editingUser.id === authUser.id && !editIsActive) {
      setEditError("Cannot deactivate your own administrator account (BR-21).");
      return;
    }

    setEditSubmitting(true);
    try {
      const updated = await updateAdminUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        isActive: editIsActive,
      });

      handleCloseEdit();
      setStatusMessage({
        type: "success",
        text: `User ${updated.name} updated successfully.`,
      });
      fetchUsers();
    } catch (err: any) {
      setEditError(err.message || "Failed to update user.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Submit Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setResetError(null);
    setResetSuccess(null);

    if (!resetPasswordVal) {
      setResetError("Please enter a new initial password.");
      return;
    }

    setResetSubmitting(true);
    try {
      await resetUserPassword(editingUser.id, resetPasswordVal);
      setResetSuccess(
        "Initial password set. User will be required to change password on next login."
      );
      setResetPasswordVal("");
      fetchUsers();
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const isSelf = editingUser ? editingUser.id === authUser.id : false;

  return (
    <div className="user-management-view" data-testid="user-management">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <span className="eyebrow">Administrator Control</span>
          <h1 className="h3 mb-0 text-primary-green">User Account Maintenance</h1>
        </div>
        <button
          type="button"
          className="btn zen-primary-button"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
          }}
          aria-label="Add new user"
        >
          + Add User
        </button>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div
          className={`alert alert-${statusMessage.type} alert-dismissible fade show`}
          role="alert"
        >
          {statusMessage.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setStatusMessage(null)}
            aria-label="Close"
          />
        </div>
      )}

      {/* Filters Bar */}
      <div className="zen-card mb-4 p-3">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-7">
            <label htmlFor="user-search-input" className="form-label visually-hidden">
              Search Users
            </label>
            <input
              id="user-search-input"
              type="search"
              className="form-control"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users by name or email"
            />
          </div>
          <div className="col-12 col-md-5 d-flex gap-2">
            <select
              id="role-filter-select"
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
            {(search || roleFilter) && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="zen-card p-0 overflow-hidden">
        {loading ? (
          <div className="p-5 text-center text-muted">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-5 text-center text-muted">
            <p className="mb-0">No users found matching your criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" aria-label="User directory">
              <thead className="table-light">
                <tr>
                  <th scope="col" style={{ width: "25%" }}>
                    Name
                  </th>
                  <th scope="col" style={{ width: "30%" }}>
                    Email
                  </th>
                  <th scope="col" style={{ width: "15%" }}>
                    Role
                  </th>
                  <th scope="col" style={{ width: "15%" }}>
                    Status
                  </th>
                  <th scope="col" style={{ width: "15%" }} className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleBadgeClass =
                    u.role === "ADMINISTRATOR"
                      ? "badge-role-admin"
                      : u.role === "IT_STAFF"
                      ? "badge-role-staff"
                      : "badge-role-requester";

                  return (
                    <tr key={u.id} data-testid={`user-row-${u.id}`}>
                      <td>
                        <span className="fw-semibold">{u.name}</span>
                        {u.id === authUser.id && (
                          <span className="badge bg-secondary ms-2" title="You">
                            You
                          </span>
                        )}
                      </td>
                      <td className="text-muted">{u.email}</td>
                      <td>
                        <span className={`badge ${roleBadgeClass}`}>
                          {u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {u.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-secondary">Inactive</span>
                        )}
                        {u.mustChangePassword && (
                          <span
                            className="badge bg-warning text-dark ms-1"
                            title="Password reset required"
                          >
                            Must Change
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => handleOpenEdit(u)}
                          aria-label={`Edit user ${u.name}`}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Create User Modal */}
      {/* ------------------------------------------------------------------ */}
      {showCreateModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="create-user-modal-title">
                  Add New User Account
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close"
                />
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  {createError && (
                    <div className="alert alert-danger" role="alert">
                      {createError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="create-name" className="form-label fw-semibold">
                      Full Name *
                    </label>
                    <input
                      id="create-name"
                      type="text"
                      className="form-control"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. Michael Scott"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="create-email" className="form-label fw-semibold">
                      Email Address *
                    </label>
                    <input
                      id="create-email"
                      type="email"
                      className="form-control"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="e.g. michael.scott@toktickit.local"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="create-role" className="form-label fw-semibold">
                      Assigned Role *
                    </label>
                    <select
                      id="create-role"
                      className="form-select"
                      value={createRole}
                      onChange={(e) =>
                        setCreateRole(
                          e.target.value as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"
                        )
                      }
                      required
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                    <div className="form-text">
                      Accounts have exactly one role defining their system permissions.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="create-password" className="form-label fw-semibold">
                      Initial Temporary Password *
                    </label>
                    <input
                      id="create-password"
                      type="password"
                      className="form-control"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Initial temporary password"
                      required
                    />
                    <div className="form-text">
                      Must be at least 8 characters, with uppercase, lowercase, and a number or
                      special character (BR-24). The user will be required to change it on first
                      login.
                    </div>
                  </div>

                  <div className="form-check mb-3">
                    <input
                      id="create-active"
                      type="checkbox"
                      className="form-check-input"
                      checked={createIsActive}
                      onChange={(e) => setCreateIsActive(e.target.checked)}
                    />
                    <label htmlFor="create-active" className="form-check-label">
                      Account is Active
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn zen-primary-button"
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Edit User Modal */}
      {/* ------------------------------------------------------------------ */}
      {editingUser && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="edit-user-modal-title">
                  Edit User: {editingUser.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseEdit}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                {editError && (
                  <div className="alert alert-danger" role="alert">
                    {editError}
                  </div>
                )}

                <form onSubmit={handleEditSubmit}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label htmlFor="edit-name" className="form-label fw-semibold">
                        Full Name
                      </label>
                      <input
                        id="edit-name"
                        type="text"
                        className="form-control"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="edit-email" className="form-label fw-semibold">
                        Email Address
                      </label>
                      <input
                        id="edit-email"
                        type="email"
                        className="form-control"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label htmlFor="edit-role" className="form-label fw-semibold">
                        Role
                      </label>
                      <select
                        id="edit-role"
                        className="form-select"
                        value={editRole}
                        onChange={(e) =>
                          setEditRole(
                            e.target.value as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"
                          )
                        }
                      >
                        <option value="REQUESTER">Requester</option>
                        <option value="IT_STAFF">IT Staff</option>
                        <option value="ADMINISTRATOR">Administrator</option>
                      </select>
                    </div>
                    <div className="col-md-6 d-flex align-items-center">
                      <div className="form-check mt-3">
                        <input
                          id="edit-active"
                          type="checkbox"
                          className="form-check-input"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          disabled={isSelf}
                        />
                        <label htmlFor="edit-active" className="form-check-label fw-semibold">
                          Active Account
                        </label>
                        {isSelf && (
                          <div
                            className="form-text text-danger"
                            data-testid="self-deactivation-warning"
                          >
                            Cannot deactivate your own administrator account (BR-21).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mb-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCloseEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn zen-primary-button"
                      disabled={editSubmitting}
                    >
                      {editSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>

                <hr className="my-4" />

                {/* Reset Password Section */}
                <div className="bg-light p-3 rounded border">
                  <h6 className="fw-bold mb-1">Reset Initial Password (BR-24)</h6>
                  <p className="text-muted small mb-3">
                    Assign a new temporary password. The user will be required to change it upon
                    their next login. All current sessions will be terminated.
                  </p>

                  {resetSuccess && (
                    <div className="alert alert-success py-2 small" role="alert">
                      {resetSuccess}
                    </div>
                  )}
                  {resetError && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      {resetError}
                    </div>
                  )}

                  <form onSubmit={handleResetPasswordSubmit}>
                    <div className="input-group">
                      <input
                        type="password"
                        className="form-control"
                        placeholder="New initial temporary password..."
                        value={resetPasswordVal}
                        onChange={(e) => setResetPasswordVal(e.target.value)}
                        aria-label="New initial password"
                      />
                      <button
                        type="submit"
                        className="btn btn-warning text-dark fw-semibold"
                        disabled={resetSubmitting}
                      >
                        {resetSubmitting ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
