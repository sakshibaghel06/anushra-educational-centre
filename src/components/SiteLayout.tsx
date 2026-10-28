import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { PublicSiteContentProvider } from "../features/public/PublicSiteContent";

export function SiteLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader />
      <PublicSiteContentProvider>
        <main id="main-content"><Outlet /></main>
      </PublicSiteContentProvider>
      <SiteFooter />
    </>
  );
}
