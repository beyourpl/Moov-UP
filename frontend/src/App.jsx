import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import ChatbotPage from "./pages/ChatbotPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import PostAuthChoicePage from "./pages/PostAuthChoicePage.jsx";
import CvLmUploader from "./components/CvLmUploader.jsx";
import PartenairesIntroPage from "./pages/PartenairesIntroPage.jsx";
import PartenairesAuthPage from "./pages/PartenairesAuthPage.jsx";
import PartenairesOfferChoicePage from "./pages/PartenairesOfferChoicePage.jsx";
import PartenairesOfferSubscribePage from "./pages/PartenairesOfferSubscribePage.jsx";
import MissionLocaleDashboardPage from "./pages/MissionLocaleDashboardPage.jsx";
import PremiumB2cHubPage from "./pages/PremiumB2cHubPage.jsx";
import { isAuthenticated } from "./data/authStorage.js";
import { getPostAuthLandingPath } from "./data/partenairesSession.js";
import { getThemePreference, subscribeUiPreferences } from "./data/uiPreferences.js";

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/auth" replace />;
}

function AuthRoute() {
  return isAuthenticated() ? <Navigate to={getPostAuthLandingPath()} replace /> : <AuthPage />;
}

export default function App() {
  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.dataset.theme = getThemePreference();
    };
    applyTheme();
    window.addEventListener("moovup-ui-change", applyTheme);
    window.addEventListener("storage", applyTheme);
    return () => {
      window.removeEventListener("moovup-ui-change", applyTheme);
      window.removeEventListener("storage", applyTheme);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/partenaires" element={<PartenairesIntroPage />} />
      <Route path="/partenaires/connexion" element={<PartenairesAuthPage />} />
      <Route path="/partenaires/offres" element={<PartenairesOfferChoicePage />} />
      <Route
        path="/partenaires/souscription/:slug"
        element={
          <ProtectedRoute>
            <PartenairesOfferSubscribePage />
          </ProtectedRoute>
        }
      />
      <Route path="/partenaires/tableau-de-bord" element={<MissionLocaleDashboardPage />} />
      <Route
        path="/partenaires/premium"
        element={
          <ProtectedRoute>
            <PremiumB2cHubPage />
          </ProtectedRoute>
        }
      />
      <Route path="/auth" element={<AuthRoute />} />
      <Route
        path="/choice"
        element={
          <ProtectedRoute>
            <PostAuthChoicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/demo"
        element={
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <ChatbotPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach"
        element={
          <ProtectedRoute>
            <ChatbotPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cvlm"
        element={
          <ProtectedRoute>
            <CvLmUploader />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
