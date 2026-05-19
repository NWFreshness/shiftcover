export default function ManagerDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          Add Shift
        </button>
      </div>
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Schedule grid coming soon...
      </div>
    </div>
  );
}