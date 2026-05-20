'use client';

import { useCallback, useEffect, useState } from 'react';
import InviteCard from './InviteCard';
import { apiFetch, normalizePhone } from '@/lib/auth';

interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  status?: string;
  isManager?: boolean;
  inviteCode?: string | null;
  qualifications?: string | string[] | null;
}

interface BusinessResponse {
  smsEnabled: boolean;
}

interface EmployeeManagerProps {
  compact?: boolean;
  onChanged?: () => Promise<void> | void;
}

interface EmployeeForm {
  name: string;
  phone: string;
  email: string;
  role: string;
  qualifications: string;
}

const blankForm: EmployeeForm = {
  name: '',
  phone: '',
  email: '',
  role: '',
  qualifications: '',
};

function parseQualifications(value: Employee['qualifications']): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function qualificationInput(value: Employee['qualifications']): string {
  return parseQualifications(value).join(', ');
}

function toQualifications(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export default function EmployeeManager({ compact = false, onChanged }: EmployeeManagerProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<{ id?: string; code: string; sent?: boolean; message?: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [employeeRes, businessRes] = await Promise.all([
      apiFetch('/api/employees'),
      apiFetch('/api/businesses'),
    ]);
    if (employeeRes.ok) {
      const data = await employeeRes.json();
      setEmployees(data.employees || []);
    }
    if (businessRes.ok) {
      const data = (await businessRes.json()) as BusinessResponse;
      setSmsEnabled(Boolean(data.smsEnabled));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(blankForm);
    setEditingId(null);
  };

  const selectEmployee = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      phone: employee.phone,
      email: employee.email || '',
      role: employee.role,
      qualifications: qualificationInput(employee.qualifications),
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setLastInvite(null);
    const payload = {
      name: form.name,
      phone: normalizePhone(form.phone),
      email: form.email || undefined,
      role: form.role,
      qualifications: toQualifications(form.qualifications),
    };
    try {
      const res = await apiFetch(editingId ? `/api/employees/${editingId}` : '/api/employees', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data = res.status === 204 ? null : await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Could not save employee');
        return;
      }
      if (!editingId && data?.inviteCode) setLastInvite({ id: data.employee?.id, code: data.inviteCode });
      resetForm();
      await load();
      await onChanged?.();
    } catch {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (employee: Employee) => {
    if (employee.isManager) {
      setMessage('Managers cannot be removed from this screen.');
      return;
    }
    const res = await apiFetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
    if (res.ok) {
      await load();
      await onChanged?.();
    }
  };

  const textInvite = async (employee: Employee) => {
    setMessage(null);
    const res = await apiFetch(`/api/employees/${employee.id}/invite`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Could not send invite');
      return;
    }
    setLastInvite({ id: employee.id, code: data.code, sent: data.sent, message: data.sent ? 'Sent by SMS.' : 'SMS unavailable; copy the code manually.' });
    await load();
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="label-stamp">{editingId ? 'Edit employee' : 'Add employee'}</span>
        </div>
        <div>
          <label className="field-label">Name</label>
          <input className="field" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required />
        </div>
        <div>
          <label className="field-label">Role</label>
          <input className="field" value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))} placeholder="Server" required />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input type="tel" className="field font-mono" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} onBlur={() => setForm((current) => ({ ...current, phone: normalizePhone(current.phone) }))} required />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input type="email" className="field" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Qualifications</label>
          <input className="field" value={form.qualifications} onChange={(e) => setForm((current) => ({ ...current, qualifications: e.target.value }))} placeholder="bar, register, closing" />
        </div>
        <div className="flex gap-2 sm:col-span-2 sm:justify-end">
          {editingId && <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>}
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : editingId ? 'Save employee' : 'Add employee'}</button>
        </div>
      </form>

      {message && <div className="banner banner-error">{message}</div>}
      {lastInvite && (
        <InviteCard
          code={lastInvite.code}
          smsEnabled={smsEnabled}
          sent={lastInvite.sent}
          message={lastInvite.message}
          onTextInvite={(() => {
            const employee = employees.find((item) => item.id === lastInvite.id);
            return employee ? () => textInvite(employee) : undefined;
          })()}
        />
      )}

      <div className={`grid gap-3 ${compact ? '' : 'lg:grid-cols-2'}`}>
        {employees.map((employee) => (
          <div key={employee.id} className="rounded-2xl border border-line bg-paper p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-ink">{employee.name}</h3>
                  {employee.isManager && <span className="chip chip-info">Manager</span>}
                  {employee.status === 'inactive' && <span className="chip chip-danger">Inactive</span>}
                </div>
                <p className="text-sm text-ink-soft">{employee.role} · <span className="font-mono">{employee.phone}</span></p>
                {employee.email && <p className="text-sm text-ink-soft">{employee.email}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {parseQualifications(employee.qualifications).map((item) => <span key={item} className="chip chip-neutral">{item}</span>)}
                </div>
                {employee.inviteCode && <p className="mt-2 font-mono text-xs text-ink-soft">Code: {employee.inviteCode}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => selectEmployee(employee)} className="btn btn-ghost btn-sm">Edit</button>
                {smsEnabled && <button type="button" onClick={() => textInvite(employee)} className="btn btn-accent btn-sm">Text invite</button>}
                {!employee.isManager && <button type="button" onClick={() => remove(employee)} className="btn btn-danger btn-sm">Remove</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
