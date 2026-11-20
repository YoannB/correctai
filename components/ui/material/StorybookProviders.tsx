"use client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";
import "./index.css";
import { buildTheme } from "./theme";
// Variant WITHOUT AppRouterCacheProvider (does not exist outside Next) for Storybook/Vite. The MUI
// theme follows the toolbar mode (like MaterialProviders follows useTheme in the app).
export function StorybookProviders({ mode = "dark", children }: { mode?: "light" | "dark"; children: ReactNode }) {
    const theme = useMemo(() => buildTheme(mode), [mode]);
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}
