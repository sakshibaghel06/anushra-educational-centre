import { ArrowUpRight, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { navigationLinks } from "../data/siteContent";
import { Brand } from "./Brand";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("menu-is-open", menuOpen);
    return () => document.body.classList.remove("menu-is-open");
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Brand onClick={() => setMenuOpen(false)} />
        <button
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          ref={menuToggle}
          type="button"
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
        <nav
          aria-label="Main navigation"
          className={`primary-navigation${menuOpen ? " primary-navigation--open" : ""}`}
          id="primary-navigation"
        >
          <div className="mobile-nav-brand">
            <Brand onClick={() => setMenuOpen(false)} />
            <button
              aria-label="Close navigation menu"
              className="menu-toggle mobile-nav-close"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <X size={23} />
            </button>
          </div>
          <div className="primary-navigation__links">
            {navigationLinks.map((link) => (
              <NavLink
                end={link.to === "/"}
                key={link.to}
                onClick={() => setMenuOpen(false)}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <NavLink
            className="header-cta"
            onClick={() => setMenuOpen(false)}
            to="/admissions"
          >
            Enquire <ArrowUpRight aria-hidden="true" size={15} />
          </NavLink>
          <NavLink className="header-login" onClick={() => setMenuOpen(false)} to="/login">
            <UserRound aria-hidden="true" size={16} /> Portal login
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
