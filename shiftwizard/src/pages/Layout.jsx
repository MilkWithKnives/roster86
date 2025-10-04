

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from '@/api/entities';
import { 
  Calendar, 
  Users, 
  Clock, 
  LayoutDashboard, 
  Settings,
  Bell,
  Moon,
  Sun,
  DollarSign, // Added for Pricing
  LogOut,
  User as UserIcon // Renamed to avoid conflict with User entity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Employees", 
    url: createPageUrl("Employees"),
    icon: Users,
  },
  {
    title: "Shift Templates",
    url: createPageUrl("ShiftTemplates"), 
    icon: Clock,
  },
  {
    title: "Schedules",
    url: createPageUrl("Schedules"),
    icon: Calendar,
  },
  {
    title: "Pricing",
    url: createPageUrl("Pricing"),
    icon: DollarSign,
  },
  {
    title: "Profile", // Added Profile navigation item
    url: createPageUrl("Profile"),
    icon: UserIcon,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (e) {
        console.error("Failed to fetch user:", e);
      }
    };
    fetchUser();
  }, []);

  React.useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const handleLogout = async () => {
    await User.logout();
    window.location.reload(); // Reload to clear state and redirect to login
  };

  return (
    <SidebarProvider>
      <style>
        {`
          :root {
            /* Light Mode - Premium Color Palette */
            --bg-primary: #ffffff;
            --bg-secondary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --bg-tertiary: rgba(255, 255, 255, 0.95);
            --bg-quaternary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            --bg-accent: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            
            --border-primary: rgba(255, 255, 255, 0.2);
            --border-secondary: rgba(255, 255, 255, 0.1);
            
            --text-primary: #1a202c;
            --text-secondary: #4a5568;
            --text-tertiary: #718096;
            --text-light: #ffffff;
            
            --accent-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --accent-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            --accent-tertiary: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            
            --shadow-soft: 0 10px 25px rgba(0, 0, 0, 0.1);
            --shadow-medium: 0 20px 40px rgba(0, 0, 0, 0.1);
            --shadow-strong: 0 30px 60px rgba(0, 0, 0, 0.15);
            
            --glass-bg: rgba(255, 255, 255, 0.25);
            --glass-border: rgba(255, 255, 255, 0.18);
          }
          
          .dark {
            /* Dark Mode - Premium Color Palette */
            --bg-primary: #1a202c;
            --bg-secondary: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
            --bg-tertiary: rgba(26, 32, 44, 0.95);
            --bg-quaternary: linear-gradient(135deg, #553c9a 0%, #b794f6 100%);
            --bg-accent: linear-gradient(135deg, #3182ce 0%, #63b3ed 100%);
            
            --border-primary: rgba(255, 255, 255, 0.1);
            --border-secondary: rgba(255, 255, 255, 0.05);
            
            --text-primary: #f7fafc;
            --text-secondary: #e2e8f0;
            --text-tertiary: #a0aec0;
            --text-light: #ffffff;
            
            --accent-primary: linear-gradient(135deg, #553c9a 0%, #b794f6 100%);
            --accent-secondary: linear-gradient(135deg, #d53f8c 0%, #f56565 100%);
            --accent-tertiary: linear-gradient(135deg, #3182ce 0%, #63b3ed 100%);
            
            --shadow-soft: 0 10px 25px rgba(0, 0, 0, 0.3);
            --shadow-medium: 0 20px 40px rgba(0, 0, 0, 0.25);
            --shadow-strong: 0 30px 60px rgba(0, 0, 0, 0.4);
            
            --glass-bg: rgba(45, 55, 72, 0.4);
            --glass-border: rgba(255, 255, 255, 0.1);
          }
          
          body {
            background: var(--bg-secondary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          }
          
          .premium-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            box-shadow: var(--shadow-soft);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .premium-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-medium);
          }
          
          .premium-button {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--text-primary);
          }
          
          .premium-button:hover {
            background: rgba(255, 255, 255, 0.4);
            transform: translateY(-1px);
            box-shadow: var(--shadow-soft);
          }
          
          .gradient-primary {
            background: var(--accent-primary);
          }
          
          .gradient-secondary {
            background: var(--accent-secondary);
          }
          
          .gradient-tertiary {
            background: var(--accent-tertiary);
          }
          
          .nav-item {
            position: relative;
            border-radius: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin: 4px 0;
          }
          
          .nav-item:hover {
            background: var(--glass-bg);
            transform: translateX(4px);
          }
          
          .nav-item.active {
            background: var(--accent-primary);
            color: var(--text-light);
            box-shadow: var(--shadow-soft);
          }
          
          .nav-item.active::after {
            content: '';
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
          
          .text-gradient {
            background: var(--accent-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .sidebar-bg {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border-right: 1px solid var(--glass-border);
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}
      </style>
      
      <div className="min-h-screen flex w-full overflow-hidden">
        <Sidebar className="sidebar-bg hidden md:block">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
                <img 
                  src="/roster86-logo.svg" 
                  alt="Roster86 Logo" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gradient">
                  Roster86
                </h2>
                <p className="text-sm opacity-75" style={{ color: 'var(--text-tertiary)' }}>
                  Smart Scheduling
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-4">
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <Link to={item.url} className="w-full">
                      <div className={`nav-item w-full px-4 py-4 flex items-center gap-4 ${
                        location.pathname === item.url ? 'active' : ''
                      }`}>
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="premium-card m-4 mb-2 p-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="md:hidden">
                  <SidebarTrigger className="premium-button p-3 rounded-2xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gradient">
                    {currentPageName || 'Dashboard'}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Effortless team scheduling made beautiful
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleDarkMode}
                  className="premium-button p-3 rounded-2xl"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                
                <div className="premium-button p-3 rounded-2xl relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 text-xs gradient-secondary rounded-full flex items-center justify-center text-white font-semibold">
                    3
                  </span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 focus:outline-none">
                      <div className="w-12 h-12 rounded-2xl gradient-tertiary flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {user ? user.full_name.charAt(0).toUpperCase() : ''}
                        </span>
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {user ? user.full_name : 'Loading...'}
                        </p>
                        <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>
                          {user ? user.role : '...'}
                        </p>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="premium-card mt-2" align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator style={{ borderColor: 'var(--border-secondary)' }} />
                    <Link to={createPageUrl("Profile")}>
                      <DropdownMenuItem className="cursor-pointer">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link to={createPageUrl("Settings")}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator style={{ borderColor: 'var(--border-secondary)' }} />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-4 pt-2 min-w-0 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

