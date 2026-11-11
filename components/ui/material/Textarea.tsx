// components/ui/material/Textarea.tsx
"use client";
import TextField from "@mui/material/TextField";
import type { AppTextareaProps } from "../types";
export function Textarea({
    label,
    ariaLabel,
    value,
    onChange,
    placeholder,
    disabled,
    error,
    helperText,
    id,
    name,
    required,
    rows = 4,
    maxLength,
    showCount,
    readOnly,
}: AppTextareaProps) {
    const counted = showCount && maxLength !== undefined;
    const field = (
        <div className="mui-field">
            <TextField
                fullWidth
                multiline
                required={required}
                disabled={disabled}
                id={id}
                name={name}
                label={label}
                placeholder={placeholder}
                rows={rows}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={!!error}
                helperText={error ?? helperText}
                slotProps={{
                    inputLabel: { shrink: !!value || undefined },
                    // Native maxlength/readonly on the <textarea>; aria-describedby is left to MUI
                    // (it wires the helper text), the native maxlength is announced on its own.
                    htmlInput: { maxLength, readOnly, "aria-label": label ? undefined : ariaLabel },
                }}
            />
        </div>
    );
    if (!counted) return field;
    // The counter sits OUTSIDE .mui-field so the rotating focus ring keeps hugging the field.
    return (
        <div className="field-counted">
            {field}
            <span className="field-count" data-full={value.length >= maxLength || undefined}>
                {value.length} / {maxLength}
            </span>
        </div>
    );
}
