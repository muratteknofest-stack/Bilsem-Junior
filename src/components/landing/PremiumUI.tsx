import React, { useId } from 'react';

type ButtonTone = 'primary' | 'quiet' | 'dark' | 'lime';

/** Shared public-facing controls; every variant retains a native button. */
export function PremiumButton({ tone = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return <button type="button" {...props} className={`zp-button zp-button-${tone} zp-ui-button ${className}`.trim()} />;
}

/** Label, help and error are associated with the input without placeholder-only instructions. */
export function PremiumField({ label, hint, error, id, className = '', 'aria-describedby': describedBy, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string; hint?: string; error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const description = [describedBy, hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') || undefined;
  return <div className={`zp-ui-field ${className}`.trim()}>
    <label htmlFor={fieldId}>{label}</label>
    <input {...props} id={fieldId} aria-describedby={description} aria-invalid={!!error} />
    {hint && <small id={`${fieldId}-hint`}>{hint}</small>}
    {error && <span id={`${fieldId}-error`} role="alert">{error}</span>}
  </div>;
}
