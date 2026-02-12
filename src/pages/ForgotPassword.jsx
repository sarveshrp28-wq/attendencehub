import React, { useState } from "react";
import { Link } from "react-router-dom";
import { siteUrl, supabase } from "../lib/supabaseClient";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus("");
    setError("");
    setSubmitting(true);

    const redirectTo = `${siteUrl}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    if (resetError) {
      setError(resetError.message);
      setSubmitting(false);
      return;
    }

    setStatus("Password reset email sent. Check your inbox.");
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel max-w-md w-full p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Attendance Hub
        </p>
        <h1 className="text-3xl font-semibold text-white mt-3">Forgot password</h1>
        <p className="text-sm text-slate-300 mt-2">
          Enter your account email to receive a secure password reset link.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">
              Email
            </label>
            <input
              className="input-field mt-2 w-full"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <button className="btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send reset email"}
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

export default ForgotPassword;
