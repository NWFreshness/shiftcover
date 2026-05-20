'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: ShiftFormData) => void;
  shift?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    role: string;
    site: string;
    assignedEmployeeId?: string;
  } | null;
  employees: { id: string; name: string; role: string }[];
}

interface ShiftFormData {
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  site: string;
  assignedEmployeeId: string;
}

export default function ShiftModal({ isOpen, onClose, onSave, shift, employees }: ShiftModalProps) {
  const [formData, setFormData] = useState<ShiftFormData>({
    date: '',
    startTime: '',
    endTime: '',
    role: '',
    site: '',
    assignedEmployeeId: '',
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        role: shift.role,
        site: shift.site,
        assignedEmployeeId: shift.assignedEmployeeId || '',
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        role: '',
        site: '',
        assignedEmployeeId: '',
      });
    }
  }, [shift, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md animate-stamp overflow-hidden"
        style={{ boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line bg-surface-sunk px-5 py-3">
          <div>
            <span className="label-stamp">{shift ? 'Edit' : 'New Entry'}</span>
            <h2 className="font-display text-lg font-bold text-ink">
              {shift ? 'Edit Shift' : 'Add Shift'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="field-label">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="field"
                required
              />
            </div>
            <div>
              <label className="field-label">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="field"
                required
              />
            </div>
          </div>

          <div>
            <label className="field-label">Role</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g. Bartender, Server"
              className="field"
              required
            />
          </div>

          <div>
            <label className="field-label">Site (optional)</label>
            <input
              type="text"
              value={formData.site}
              onChange={(e) => setFormData({ ...formData, site: e.target.value })}
              placeholder="e.g. Main Bar, Patio"
              className="field"
            />
          </div>

          <div>
            <label className="field-label">Assign Employee (optional)</label>
            <select
              value={formData.assignedEmployeeId}
              onChange={(e) => setFormData({ ...formData, assignedEmployeeId: e.target.value })}
              className="field"
            >
              <option value="">Unassigned — post as open shift</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {shift ? 'Save Changes' : 'Add Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
