import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function SiteHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const initials = user?.name?.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase() || "R";

  const dashboard = user?.role === "SYSTEM_ADMIN" ? "/admin" : user?.role === "CLIENT" ? "/partner" : "/account";
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return <header className="site-header">
    <Link className="brand" to="/movies"><span className="brand-mark">R</span>reservit</Link>
    <nav className="nav-links"><Link to="/movies">Now showing</Link><a href="#coming-soon">Coming soon</a></nav>
    {user ? <div className="account-actions"><Link className="profile" to={dashboard} title="Open dashboard"><span>Hi, {user.name.split(" ")[0]}</span><i className="avatar">{initials}</i></Link><button className="logout-button" type="button" onClick={handleLogout}>Log out</button></div> : <Link className="btn btn-dark" to="/login">Sign in</Link>}
  </header>;
}
