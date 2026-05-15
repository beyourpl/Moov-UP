import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Retour navigateur (history −1) avec repli si la pile ne permet pas un retour fiable.
 */
export function useNavigateBack(fallbackPath = "/") {
  const navigate = useNavigate();
  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath);
  }, [navigate, fallbackPath]);
}
