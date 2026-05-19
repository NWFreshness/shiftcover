interface OpenShiftCardProps {
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    role: string;
    site: string | null;
    businessId: string;
  };
  onClaim: (shiftId: string) => void;
  claiming: boolean;
}

export default function OpenShiftCard({ shift, onClaim, claiming }: OpenShiftCardProps) {
  const date = new Date(shift.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-lg font-semibold text-gray-900">{shift.role}</div>
          {shift.site && (
            <div className="text-sm text-gray-500 mt-1">{shift.site}</div>
          )}
          <div className="text-sm text-gray-600 mt-2">
            {formattedDate} · {shift.startTime} - {shift.endTime}
          </div>
        </div>
        <button
          onClick={() => onClaim(shift.id)}
          disabled={claiming}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            claiming
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {claiming ? 'Claiming...' : 'Claim'}
        </button>
      </div>
    </div>
  );
}
