import '../styles/switch-field.css';

type SwitchFieldProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function SwitchField({ checked, label, onChange }: SwitchFieldProps) {
  return (
    <label className="toggle-field toggle-field--switch">
      <input
        className="toggle-field__input"
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="toggle-field__control" aria-hidden="true" />
      <span className="toggle-field__label">{label}</span>
    </label>
  );
}
