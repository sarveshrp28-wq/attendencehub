import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Chrome } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { signInWithGoogle, signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const redirectAfterLogin = () => {
    const from = location.state?.from?.pathname;
    if (from && from !== "/login") {
      navigate(from, { replace: true });
      return;
    }
    navigate("/", { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    setError("");
    const { data, error: signInError } = await signInWithGoogle();
    if (signInError) {
      setError(signInError.message);
      setGoogleSubmitting(false);
      return;
    }
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    redirectAfterLogin();
  };

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();
    setError("");
    setPasswordSubmitting(true);

    const { error: signInError } = await signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setPasswordSubmitting(false);
      return;
    }

    redirectAfterLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel max-w-md w-full p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Attendance Hub
        </p>
        <h1 className="text-3xl font-semibold text-white mt-3">Sign in</h1>
        <p className="text-sm text-slate-300 mt-2">
          Sign in with your student/admin account.
        </p>

        <div className="mt-6 space-y-4">
          <form className="space-y-3" onSubmit={handlePasswordSignIn}>
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
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400">
                Password
              </label>
              <input
                className="input-field mt-2 w-full"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={passwordSubmitting}>
              {passwordSubmitting ? "Signing in..." : "Sign in with password"}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-widest text-slate-400">or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button className="btn-outline w-full" onClick={handleGoogleSignIn} disabled={googleSubmitting}>
            <Chrome className="h-4 w-4" />
            {googleSubmitting ? "Redirecting..." : "Continue with Google"}
          </button>

          {error ? <p className="text-sm text-rose-200">{error}</p> : null}

          <div className="flex items-center justify-between text-xs">
            <Link className="text-slate-300 hover:text-white underline" to="/forgot-password">
              Forgot password?
            </Link>
            <span className="text-slate-400">
              Use your approved email only.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
