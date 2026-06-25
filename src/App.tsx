import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LeaderboardsPanel } from "./components/LeaderboardsPanel";
import { ForgePage } from "./pages/ForgePage";
import { HomePage } from "./pages/HomePage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { SellPage } from "./pages/SellPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <HomePage />
              <LeaderboardsPanel />
            </>
          }
        />
        <Route path="/forge" element={<ForgePage />} />
        <Route path="/forge/:id" element={<ListingDetailPage />} />
        <Route path="/sell" element={<SellPage />} />
      </Routes>
    </Layout>
  );
}
