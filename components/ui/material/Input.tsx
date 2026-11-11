// components/ui/material/Input.tsx
"use client";
import TextField from "@mui/material/TextField";
import type { AppInputProps } from "../types";
export function Input({
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
    type = "text",
}: AppInputProps) {
    return (
        <div className="mui-field">
            <TextField
                fullWidth
                required={required}
                disabled={disabled}
                id={id}
                name={name}
                label={label}
                placeholder={placeholder}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={!!error}
                helperText={error ?? helperText}
                slotProps={{
                    inputLabel: { shrink: !!value || undefined },
                    htmlInput: { autoComplete: "off", "aria-label": label ? undefined : ariaLabel },
                }}
            />
        </div>
    );
}
