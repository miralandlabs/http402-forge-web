import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LeaderboardsPanel } from "./components/LeaderboardsPanel";
import { CorporateComingSoonPage } from "./pages/CorporateComingSoonPage";
import { ForgePage } from "./pages/ForgePage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { PortalHomePage } from "./pages/PortalHomePage";
import { SellPage } from "./pages/SellPage";
import { SovereignChannelsPage } from "./pages/SovereignChannelsPage";
import { ToolsChannelsPage } from "./pages/ToolsChannelsPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PortalHomePage />} />
        <Route path="/sovereign" element={<SovereignChannelsPage />} />
        <Route path="/sovereign/tools" element={<ToolsChannelsPage />} />
        <Route path="/corporate" element={<CorporateComingSoonPage />} />
        <Route
          path="/forge"
          element={
            <>
              <ForgePage />
              <LeaderboardsPanel />
            </>
          }
        />
        <Route path="/forge/:id" element={<ListingDetailPage />} />
        <Route path="/sell" element={<SellPage />} />
      </Routes>
    </Layout>
  );
}
