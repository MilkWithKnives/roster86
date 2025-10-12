import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import Employees from "./Employees";
import ShiftTemplates from "./ShiftTemplates";
import Schedules from "./Schedules";
import Settings from "./Settings";
import Pricing from "./Pricing";
import PricingPublic from "./PricingPublic";
import Profile from "./Profile";
import Login from "./Login";
import Register from "./Register";
import Landing from "./Landing";
import ProtectedRoute from '@/components/auth/ProtectedRoute';

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

// Removed unused PagesContent function - now using direct Routes in Pages component

export default function Pages() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/pricing-public" element={<PricingPublic />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<ProtectedRoute><Layout currentPageName="Dashboard"><Dashboard /></Layout></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute><Layout currentPageName="Employees"><Employees /></Layout></ProtectedRoute>} />
                <Route path="/shifttemplates" element={<ProtectedRoute><Layout currentPageName="ShiftTemplates"><ShiftTemplates /></Layout></ProtectedRoute>} />
                <Route path="/schedules" element={<ProtectedRoute><Layout currentPageName="Schedules"><Schedules /></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout currentPageName="Settings"><Settings /></Layout></ProtectedRoute>} />
                <Route path="/pricing" element={<ProtectedRoute><Layout currentPageName="Pricing"><Pricing /></Layout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Layout currentPageName="Profile"><Profile /></Layout></ProtectedRoute>} />
                {/* 404 - Redirect to dashboard for authenticated users, landing for others */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}