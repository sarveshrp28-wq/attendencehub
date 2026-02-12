import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { createEphemeralSupabaseClient, supabase } from "../../lib/supabaseClient";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const StudentSettings = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem("attendance_hub_email_notifications");
    if (raw === "disabled") {
      setNotificationsEnabled(false);
    }
  }, []);

  const saveNotifications = (enabled) => {
    setNotificationsEnabled(enabled);
    window.localStorage.setItem(
      "attendance_hub_email_notifications",
      enabled ? "enabled" : "disabled"
    );
    setStatus(`Email notifications ${enabled ? "enabled" : "disabled"}.`);
    setError("");
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!user?.email) {
      setError("You must be signed in to change password.");
      return;
    }

    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);

    const verifyClient = createEphemeralSupabaseClient();
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      setError("Current password is incorrect.");
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus("Password changed successfully.");
    setSubmitting(false);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Account"
        subtitle="Manage password and personal notification preferences."
      />

      <Card>
        <h3 className="text-lg font-semibold text-white">Account Identity</h3>
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p>
            Signed in as: <span className="text-white">{user?.email || "-"}</span>
          </p>
          <p>
            Name, class, and profile data are managed by your admin.
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-white">Change Password</h3>
        <form className="mt-4 space-y-4" onSubmit={handleChangePassword}>
          <div>
            <label className="text-sm text-slate-300">Current password</label>
            <input
              className="input-field mt-2"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">New password</label>
            <input
              className="input-field mt-2"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Confirm new password</label>
            <input
              className="input-field mt-2"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Change password"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-white">Email Notifications</h3>
        <p className="text-sm text-slate-300 mt-2">
          Choose whether you want attendance-related email notifications.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant={notificationsEnabled ? "primary" : "secondary"}
            onClick={() => saveNotifications(true)}
          >
            Enable
          </Button>
          <Button
            variant={!notificationsEnabled ? "primary" : "secondary"}
            onClick={() => saveNotifications(false)}
          >
            Disable
          </Button>
        </div>
      </Card>

      {status ? <p className="text-sm text-emerald-200">{status}</p> : null}
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
    </div>
  );
};

export default StudentSettings;
