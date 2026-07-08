import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Início", end: true },
  { to: "/recommendations", label: "Recomendações" },
  { to: "/favorites", label: "Favoritos" },
  { to: "/history", label: "Histórico" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight">
          🎬 <span className="hidden sm:inline">UNIPDS · Filmes</span>
        </Link>

        <form onSubmit={onSearch} className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar filmes…"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500"
          />
        </form>

        <nav className="order-2 flex items-center gap-1 sm:order-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-100"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="order-4 flex items-center gap-3 border-l border-slate-800 pl-3">
            <span className="hidden text-sm text-slate-300 md:inline">
              {user.name}
            </span>
            <button
              onClick={logout}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-rose-400"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
