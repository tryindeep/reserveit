import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function SiteHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const initials = user?.name?.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase() || "R";

  const signOut = () => { logout(); navigate("/login"); };
  return <header className="site-header">
    <Link className="brand" to="/movies"><span className="brand-mark">R</span>reservit</Link>
    <nav className="nav-links"><Link to="/movies">Now showing</Link><a href="#coming-soon">Coming soon</a></nav>
    <button className="profile" onClick={signOut} title="Sign out"><span>Hi, {user?.name?.split(" ")[0] || "there"}</span><i className="avatar">{initials}</i></button>
  </header>;
}
