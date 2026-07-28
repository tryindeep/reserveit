import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";

export function SiteHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("reservit-theme") === "light" ? "light" : "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("reservit-theme", theme);
  }, [theme]);
  const initials =
    user?.name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "R";

  const dashboard =
    user?.role === "SYSTEM_ADMIN"
      ? "/admin"
      : user?.role === "CLIENT"
        ? "/partner"
        : "/account";
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="site-header-shell">
    <header className="site-header">
      <Link className="brand" to="/movies">
        <span className="brand-mark"><img src="/reserveit-mark.svg" alt="" /></span>reserveit
      </Link>
      <nav className="nav-links">
        <Link to="/movies">Now showing</Link>
        <a href="#coming-soon">Coming soon</a>
      </nav>
      <div className="header-utilities">
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          <span className="theme-label">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      {user ? (
        <div className="account-actions">
          <Link className="profile" to={dashboard} title="Open dashboard">
            <span>Hi, {user.name.split(" ")[0]}</span>
            <i className="avatar">{initials}</i>
          </Link>
          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      ) : (
        <Link className="btn btn-dark" to="/login">
          Sign in
        </Link>
      )}
      </div>
    </header>
    </div>
  );
}
