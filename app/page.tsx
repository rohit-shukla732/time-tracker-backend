export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold text-center sm:text-left">
          ACE HCS - Management System
        </h1>
        
        {/* <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">Main Applications</h2>
          <div className="grid gap-4">
            <a 
              href="/time-tracker/admin" 
              className="block bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <h3 className="font-semibold text-blue-600 dark:text-blue-400">⏱️ Time Tracker</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Employee time tracking, attendance, sessions, and activity monitoring
              </p>
            </a>

            <a 
              href="/ticketing" 
              className="block bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <h3 className="font-semibold text-purple-600 dark:text-purple-400">🎫 Ticketing System</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Support ticket management, issue tracking, and resolution workflow
              </p>
            </a>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
          <h2 className="text-2xl font-semibold mb-4">Quick Access</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-blue-600 mb-2">Time Tracker</h3>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li><a href="/time-tracker/admin" className="hover:underline">Admin Dashboard</a></li>
                <li><a href="/time-tracker/manager" className="hover:underline">Manager Portal</a></li>
                <li><a href="/time-tracker/employee" className="hover:underline">Employee Portal</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-purple-600 mb-2">Ticketing</h3>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li><a href="/ticketing" className="hover:underline">Dashboard</a></li>
                <li><a href="/ticketing/new" className="hover:underline">Create Ticket</a></li>
                <li><a href="/ticketing/my-tickets" className="hover:underline">My Tickets</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
          <h2 className="text-2xl font-semibold mb-4">Core API Endpoints</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-blue-600 mb-2">Authentication</h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/auth/register</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/auth/login</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/auth/refresh</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/auth/logout</code></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-green-600 mb-2">Time Tracking</h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/session/start</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/session/end</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/heartbeat</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/events</code></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-purple-600 mb-2">User & Team Management</h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">GET /api/users</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">PATCH /api/users/[id]/role</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">GET /api/teams</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST /api/teams</code></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-orange-600 mb-2">Dashboard & Analytics</h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">GET /api/dashboard</code></li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">GET /api/health</code></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            🚀 Role-Based Access Control Implemented
          </h3>
          <div className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
            <p>✅ 4 Role types: ADMIN, MANAGER, HR, EMPLOYEE (default)</p>
            <p>✅ Team hierarchy with manager relationships</p>
            <p>✅ Role-based data visibility and permissions</p>
            <p>✅ Complete authentication system with JWT tokens</p>
            <p>✅ Session tracking and event logging</p>
          </div>
        </div> */}
      </main>
    </div>
  );
}
