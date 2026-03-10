import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import ShortLinks from "./pages/ShortLinks";
import LeadForm from "./pages/LeadForm";
import AllLinks from "./pages/AllLinks";
import AllLeads from "./pages/AllLeads";
import Profile from "./pages/Profile";
import SocialMedias from "./pages/SocialMedias";
import Trackers from "./pages/Trackers";
import FormCreate from "./pages/FormCreate";
import ProfileCreate from "./pages/ProfileCard";
import ManageCard from "./pages/ManageCard";
import FormView from "./pages/FormView";
import CardView from "./pages/CardView";
import ThankYou from "./pages/ThankYou";
import ManageForms from "./pages/ManageForms";
import DeletedForms from "./pages/DeletedForms";
import DeletedCards from "./pages/DeletedCards";
import ManageShortLinks from "./pages/ManageShortLinks";
import DeletedShortLinks from "./pages/DeletedShortLinks";
import ShortLinkRedirect from "./pages/ShortLinkRedirect";
import ShortLinkStats from "./pages/ShortLinksStats";
import ProtectedRoute from "./components/ProtectedRoute";
import Pricing from "./pages/Pricing";

function App() {

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/lead-form" element={<LeadForm />} />
      <Route path="/form/:id" element={<FormView />} />
      <Route path="/form-preview" element={<FormView />} />
      <Route path="/thank-you" element={<ThankYou />} />
      <Route path="/contact/:id" element={<CardView />} />
      <Route path="/shortlinks/:slug" element={<ShortLinkRedirect />} />

      {/* Dashboard Layout - Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/analytics" replace />} />
        <Route path="analytics" element={<Dashboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="short-links" element={<ShortLinks />} />
        <Route path="manage-short-links" element={<ManageShortLinks />} />
        <Route path="short-links-stats" element={<ShortLinkStats />} />
        <Route path="deleted-short-links" element={<DeletedShortLinks />} />
        <Route path="create-form" element={<FormCreate />} />
        <Route path="create-card" element={<ProfileCreate />} />
        <Route path="manage-cards" element={<ManageCard />} />
        <Route path="manage-forms" element={<ManageForms />} />
        <Route path="deleted-forms" element={<DeletedForms />} />
        <Route path="deleted-cards" element={<DeletedCards />} />
        <Route path="all-links" element={<AllLinks />} />
        <Route path="all-leads" element={<AllLeads />} />
        <Route path="profile" element={<Profile />} />
        <Route path="social-medias" element={<SocialMedias />} />
        <Route path="trackers" element={<Trackers />} />
      </Route>
    </Routes>
  );
}

export default App;
