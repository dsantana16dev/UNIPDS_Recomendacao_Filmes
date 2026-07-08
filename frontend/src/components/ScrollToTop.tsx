import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Reseta o scroll ao trocar de rota (ex.: da lista para o detalhe do filme). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
