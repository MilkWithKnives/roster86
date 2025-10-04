import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Employees from "./Employees";

import ShiftTemplates from "./ShiftTemplates";

import Schedules from "./Schedules";

import Settings from "./Settings";

import Pricing from "./Pricing";

import Profile from "./Profile";

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
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Employees" element={<Employees />} />
                
                <Route path="/ShiftTemplates" element={<ShiftTemplates />} />
                
                <Route path="/Schedules" element={<Schedules />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Pricing" element={<Pricing />} />
                
                <Route path="/Profile" element={<Profile />} />
                
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