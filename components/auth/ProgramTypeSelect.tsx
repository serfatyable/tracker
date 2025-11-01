'use client';

type Props = {
  id: string;
  value: '4-year' | '6-year' | '';
  onChange: (v: '4-year' | '6-year') => void;
  label: string;
  option4Year: string;
  option6Year: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
};

export default function ProgramTypeSelect({
  id,
  value,
  onChange,
  label,
  option4Year,
  option6Year,
  required,
  disabled,
  error,
}: Props) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 dark:text-white">
        <span suppressHydrationWarning>{label}</span>
        {required && <span className="text-red-600 ms-1">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as '4-year' | '6-year')}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className="input-levitate"
      >
        <option value="">-- {label} --</option>
        <option value="4-year">{option4Year}</option>
        <option value="6-year">{option6Year}</option>
      </select>
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
