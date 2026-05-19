import ScheduleGrid from '@/components/ScheduleGrid';
import CoverageToggle from '@/components/CoverageToggle';

// For demo, hardcode a business ID
const DEMO_BUSINESS_ID = 'demo';

export default function ManagerDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">Week of {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
            Add Shift
          </button>
        </div>
      </div>

      {/* Coverage Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">12</div>
          <div className="text-sm text-gray-500">Total Shifts</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">10</div>
          <div className="text-sm text-gray-500">Filled</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-amber-600">2</div>
          <div className="text-sm text-gray-500">Open</div>
        </div>
      </div>

      <CoverageToggle businessId={DEMO_BUSINESS_ID} />

      <ScheduleGrid businessId={DEMO_BUSINESS_ID} />
    </div>
  );
}