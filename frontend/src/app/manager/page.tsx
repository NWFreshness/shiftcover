'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ScheduleGrid from '@/components/ScheduleGrid';
import CoverageToggle from '@/components/CoverageToggle';
import ShiftModal from '@/components/ShiftModal';
import { apiFetch, getToken, isManager } from '@/lib/auth';

interface ShiftFormData {
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  site: string;
  assignedEmployeeId: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface Stats {
  total: number;
  filled: number;
  open: number;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, filled: 0, open: 0 });

  const loadData = useCallback(async () => {
    const [statsRes, empRes] = await Promise.all([
      apiFetch('/api/coverage/stats'),
      apiFetch('/api/employees'),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (empRes.ok) setEmployees((await empRes.json()).employees || []);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    if (!isManager()) {
      router.replace('/board');
      return;
    }
    loadData();
  }, [router, loadData]);

  const handleAddShift = async (data: ShiftFormData) => {
    const res = await apiFetch('/api/shifts', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        assignedEmployeeId: data.assignedEmployeeId || undefined,
      }),
    });
    if (res.ok) {
      setModalOpen(false);
      loadData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">Week of {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/manager/settings"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
          >
            Settings
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            Add Shift
          </button>
        </div>
      </div>

      {/* Coverage Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Shifts</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.filled}</div>
          <div className="text-sm text-gray-500">Filled</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.open}</div>
          <div className="text-sm text-gray-500">Open</div>
        </div>
      </div>

      <CoverageToggle />

      <div className="mt-6">
        <ScheduleGrid />
      </div>

      <ShiftModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddShift}
        employees={employees}
      />
    </div>
  );
}
