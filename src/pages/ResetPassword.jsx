import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setStatus("Password updated successfully. Redirecting to login...");
    setTimeout(() => navigate("/login", { replace: true }), 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel max-w-md w-full p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Attendance Hub
        </p>
        <h1 className="text-3xl font-semibold text-white mt-3">Reset password</h1>
        <p className="text-sm text-slate-300 mt-2">
          Set a new password for your account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">
              New Password
            </label>
            <input
              className="input-field mt-2 w-full"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">
              Confirm Password
            </label>
            <input
              className="input-field mt-2 w-full"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          <button className="btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>

        {status ? <p className="text-sm text-emerald-200 mt-4">{status}</p> : null}
        {error ? <p className="text-sm text-rose-200 mt-4">{error}</p> : null}

        <Link className="btn-outline mt-6 inline-flex" to="/login">
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
