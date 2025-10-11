import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import Employees from "./Employees";
import ShiftTemplates from "./ShiftTemplates";
import Schedules from "./Schedules";
import Settings from "./Settings";
import Pricing from "./Pricing";
import Profile from "./Profile";
import Login from "./Login";
import Register from "./Register";
import Landing from "./Landing";
import ProtectedRoute from '@/components/auth/ProtectedRoute';

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Dashboard: Dashboard,
    Employees: Employees,
    ShiftTemplates: ShiftTemplates,
    Schedules: Schedules,
    Settings: Settings,
    Pricing: Pricing,
    Profile: Profile,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const isLandingPage = location.pathname === '/';

    // Landing page - no layout or auth required
    if (isLandingPage) {
        return (
            <Routes>
                <Route path="/" element={<Landing />} />
            </Routes>
        );
    }

    // Auth pages - no layout
    if (isAuthPage) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Routes>
        );
    }

    // Protected pages - with layout
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
                <Route path="/shifttemplates" element={<ProtectedRoute><ShiftTemplates /></ProtectedRoute>} />
                <Route path="/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}