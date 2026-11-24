// Legal publisher values (LEGAL_* env, read in i18n/request.ts) injected into messages/<locale>.json
// BEFORE next-intl. The legal/privacy pages read their sections with `t.raw`, so next-intl never
// evaluates ICU there: a plain `{token}` is string-substituted with an ICU-escaped value (unchanged
// behaviour), and only a string that carries an `{addressKind, select, …}` is formatted here with
// intl-messageformat, the raw values passed as ICU arguments (so no escaping shows through).
// Pure: no env, no fs.

import { IntlMessageFormat } from "intl-messageformat";

export type AddressKind = "street" | "city";

const SELECT_MARKER = "{addressKind";

/** Escapes the ICU/MessageFormat special characters ' { } # of a substituted value. */
export function escapeIcuText(value: string): string {
    return value.replace(/['#{}]/g, (match) => (match === "'" ? "''" : `'${match}'`));
}

/** LEGAL_EDITOR_ADDRESS_KIND: `city` when the address is only a city; anything else → `street` (default). */
export function parseAddressKind(raw: string): AddressKind {
    return raw === "city" ? "city" : "street";
}

/** Recursively fills the legal tokens of a raw messages tree. `vars` holds the RAW (unescaped) values. */
export function interpolateLegal(value: unknown, vars: Record<string, string>, locale: string): unknown {
    if (typeof value === "string") {
        if (value.includes(SELECT_MARKER)) {
            return new IntlMessageFormat(value, locale).format<string>(vars) as string;
        }

        let output = value;

        for (const [key, replacement] of Object.entries(vars)) {
            const token = `{${key}}`;

            if (output.includes(token)) {
                output = output.split(token).join(escapeIcuText(replacement));
            }
        }

        return output;
    }

    if (Array.isArray(value)) {
        return value.map((item) => interpolateLegal(item, vars, locale));
    }

    if (value && typeof value === "object") {
        const result: Record<string, unknown> = {};

        for (const [key, item] of Object.entries(value)) {
            result[key] = interpolateLegal(item, vars, locale);
        }

        return result;
    }

    return value;
}
