export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold text-center sm:text-left">
          ACE EMS - Time Tracker Backend
        </h1>
        
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
          <div className="space-y-3">
            <div>
              <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-sm">
                GET /api/time-entries
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                List time entries with optional filtering
              </p>
            </div>
            
            <div>
              <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-sm">
                POST /api/time-entries
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create a new time entry
              </p>
            </div>
            
            <div>
              <code className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded text-sm">
                PATCH /api/time-entries/[id]/stop
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Stop a running time entry
              </p>
            </div>
            
            <div>
              <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-sm">
                GET /api/projects
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                List all active projects
              </p>
            </div>
            
            <div>
              <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-sm">
                POST /api/projects
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create a new project
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            🚀 Monorepo Structure Ready
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            This backend is part of the ACE EMS monorepo. Ready to add more applications like IMS, HRMS, etc.
          </p>
        </div>
      </main>
    </div>
  );
}
