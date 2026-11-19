import { PALETTE, type PaletteMode } from "@/constants/site";
import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles";

// The mode IS PASSED AS A PARAMETER (no more hard-coded 'dark'): otherwise CssBaseline paints the
// <body> #121212 and field texts stay light => light mode breaks.
//
// background.default/paper = 'transparent' so that styles/tokens.css (--* tokens) keeps
// control over backgrounds, with no cascade war against the Emotion-injected styles.
//
// Colours come from constants/site.ts `PALETTE` (one entry per mode).
export function buildTheme(mode: "light" | "dark", palette: PaletteMode = PALETTE[mode]): Theme {
    return createTheme({
        cssVariables: true,
        palette: {
            mode,
            primary: { main: palette.primary, contrastText: palette.contrastText },
            secondary: { main: palette.secondary },
            background: {
                default: "transparent",
                paper: "transparent",
                // MUI v9 cannot derive a channel from 'transparent' (not parsable): the token is
                // explicitly removed to silence the warning, the background being controlled
                // by styles/base.css (CssBaseline must paint nothing).
                defaultChannel: undefined,
                paperChannel: undefined,
            },
        } as unknown as ThemeOptions["palette"],
        shape: { borderRadius: 12 },
        typography: {
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: "none",
                        fontWeight: 600,
                    },
                },
            },
            // CssBaseline injects `body { background-color: var(--mui-palette-background-default);
            // color: var(--mui-palette-text-primary) }` AFTER styles/base.css (Emotion): the transparent
            // background erased --bg-0, and a palette built for the other mode (Storybook) painted the
            // text white on light. Re-point both at the tokens so styles/tokens.css stays authoritative.
            MuiCssBaseline: {
                styleOverrides: {
                    root: "html,body{margin:0}body{background-color:var(--bg-0);color:var(--text-1)}",
                },
            },
        },
    });
}

export const theme = buildTheme("dark");
