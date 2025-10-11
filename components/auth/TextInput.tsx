"use client";

type Props = {
	id: string;
	type?: string;
	value: string;
	onChange: (v: string) => void;
	label: string;
	required?: boolean;
	disabled?: boolean;
	error?: string | null;
};

export default function TextInput({ id, type = 'text', value, onChange, label, required, disabled, error }: Props) {
	const errorId = `${id}-error`;
	return (
		<div className="space-y-1">
			<label htmlFor={id} className="block text-sm font-medium">{label}</label>
			<input
				type={type}
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				required={required}
				disabled={disabled}
				aria-invalid={Boolean(error) || undefined}
				aria-describedby={error ? errorId : undefined}
				className="input-levitate"
			/>
			{error ? <p id={errorId} className="text-sm text-red-600">{error}</p> : null}
		</div>
	);
}
