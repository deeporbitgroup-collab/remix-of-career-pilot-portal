import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Talent Pool colours are fixed by page, not chosen by the user:
 * - the Talent Pool landing (/talent-pool) is dark (white text on near-black);
 * - every personal area (student, company, admin, auth, reset) is light
 *   (dark text on white).
 * The light look is the `tp-light` class on <html>, which only restyles elements
 * inside `.tp-cb` / `.tp-cb-portal` (see src/index.css), so the rest of Career
 * Pilot is untouched. Setting it on <html> also covers dialogs rendered in portals.
 */
export const isTalentPoolLightRoute = (pathname: string) =>
  pathname.startsWith('/talent-pool/');

export const TalentPoolThemeSync = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('tp-light', isTalentPoolLightRoute(pathname));
  }, [pathname]);

  return null;
};
