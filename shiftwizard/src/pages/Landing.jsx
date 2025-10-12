import React from 'react';
import { Calendar, Users, Clock, Zap, Shield, RefreshCw, Bell, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900">ROSTER86</div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); navigate('/pricing-public'); }} className="text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-gray-900">Login</button>
            <button onClick={() => navigate('/register')} className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">Sign up</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-gray-600">AI-Powered Scheduling v2.1 is live</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Effortless auto scheduling for all your needs.
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Whether you're managing a small team or a large workforce, our platform offers the perfect balance of automation and control.
            </p>
            <div className="flex gap-4">
              <button onClick={() => navigate('/register')} className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-medium">
                Try it for free
              </button>
              <button onClick={() => navigate('/pricing-public')} className="bg-white text-gray-900 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium">
                Check plans
              </button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Welcome back, David</h3>
                <p className="text-sm text-gray-500">Wednesday, Sept 13, 2024</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  <Zap className="w-4 h-4" />
                  Auto-schedule
                </button>
                <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
                  Add Shift
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total shifts this week</div>
                <div className="text-3xl font-bold text-gray-900">247</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Team members</div>
                <div className="text-3xl font-bold text-gray-900">38</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Schedule coverage</div>
                <div className="text-3xl font-bold text-gray-900">98.2%</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Time saved</div>
                <div className="text-3xl font-bold text-gray-900">12.5h</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 h-3 rounded-full mb-2"></div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-600 mb-8">Trusted by the best companies around the world.</p>
        <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
          <div className="text-2xl font-bold">LOGOIPSUM</div>
          <div className="text-2xl font-bold">LOGO</div>
          <div className="text-2xl font-bold">IPSUM</div>
          <div className="text-2xl font-bold">logo ipsum</div>
          <div className="text-2xl font-bold">LOGOIPSUM</div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="bg-purple-100 text-purple-600 px-4 py-1 rounded-full text-sm font-medium">Features</span>
          <h2 className="text-4xl font-bold text-gray-900 mt-4 mb-3">The most unique features</h2>
          <p className="text-gray-600">Use Roster86 seamlessly everywhere you go.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">AI-powered auto scheduling</h3>
            <p className="text-gray-600 mb-4">Let our intelligent algorithm create optimal schedules based on availability, preferences, and business needs.</p>
            <a href="#" className="text-purple-600 font-medium flex items-center gap-2 hover:gap-3 transition-all">
              Learn more →
            </a>
          </div>

          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-8 flex items-center justify-center">
            <Calendar className="w-64 h-64 text-purple-300" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Always synced</h3>
            <p className="text-gray-600">Real-time updates across all devices. Changes sync instantly to keep everyone on the same page.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Team availability tracking</h3>
            <p className="text-gray-600">Track time-off requests, preferences, and availability all in one place for smarter scheduling.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
              <Shield className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Conflict detection</h4>
            </div>
            <p className="text-gray-600">Automatically detect and prevent scheduling conflicts before they happen.</p>
          </div>

          <div className="text-center">
            <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
              <Bell className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Smart notifications</h4>
            </div>
            <p className="text-gray-600">Keep your team informed with automated shift reminders and schedule updates.</p>
          </div>

          <div className="text-center">
            <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
              <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Analytics & insights</h4>
            </div>
            <p className="text-gray-600">Track labor costs, coverage gaps, and team productivity with detailed reports.</p>
          </div>
        </div>
      </section>

      {/* Customizable UI Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900">This Week's Schedule</h4>
                <span className="text-sm text-gray-500">Sept 11-17, 2024</span>
              </div>
              <div className="space-y-3">
                {['Morning Shift - 8:00 AM', 'Afternoon - 2:00 PM', 'Evening - 6:00 PM', 'Night Shift - 10:00 PM'].map((shift, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="text-sm text-gray-900">{shift}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      i % 3 === 0 ? 'bg-green-100 text-green-700' :
                      i % 3 === 1 ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      Assigned
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Customizable User Interface</h2>
            <p className="text-gray-600 mb-6">
              Personalize the interface to match your preferences, allowing for a seamless and intuitive user experience tailored to your workflow.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                </div>
                <span className="text-gray-700">Multiple calendar views (week, month, list)</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                </div>
                <span className="text-gray-700">Drag-and-drop shift assignments</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                </div>
                <span className="text-gray-700">Dark and Light Modes</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                </div>
                <span className="text-gray-700">Custom shift templates</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Ready to transform your scheduling?</h2>
        <p className="text-xl text-gray-600 mb-8">Join thousands of teams saving time with Roster86</p>
        <button onClick={() => navigate('/register')} className="bg-gray-900 text-white px-8 py-4 rounded-lg hover:bg-gray-800 font-medium text-lg">
          Start Free Trial
        </button>
      </section>
    </div>
  );
}
