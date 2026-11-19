// components/ui/Terminal.stories.tsx
import { useScriptedSequence } from "@/hooks/use-scripted-sequence";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { Terminal } from "./Terminal";
import type { AppTerminalLine } from "./types";

const LINES: AppTerminalLine[] = [
    { id: "1", kind: "command", text: "npm run generate-site" },
    { id: "2", text: "Initializing the project…" },
    { id: "3", kind: "success", text: "Creating the components" },
    { id: "4", kind: "success", text: "SEO optimization (meta, sitemap, robots.txt)" },
    { id: "5", kind: "success", text: "Site is live!" },
    { id: "6", kind: "link", text: "https://example.netlify.app", href: "https://example.netlify.app" },
];

function Scripted() {
    const seq = useScriptedSequence(LINES.length, 400);
    return (
        <Terminal
            ariaLabel="Demo"
            title="Terminal"
            lines={LINES.slice(0, seq.shown)}
            running={seq.status === "running"}
            actions={
                <>
                    <Button size="sm" variant="primary" onClick={seq.start} disabled={seq.status === "running"}>
                        Run
                    </Button>
                    <Button size="sm" variant="ghost" onClick={seq.reset}>
                        Reset
                    </Button>
                </>
            }
        />
    );
}

const meta = {
    title: "UI/Terminal",
    component: Terminal,
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "Read-only console (neutral, no MUI): typed lines `command | output | success | error | link`, React text (never innerHTML), `role=log` + `aria-live=polite` region (new lines are announced), maximum height via `rows`, blinking cursor while `running`. Paired with `useScriptedSequence` for a scripted demo; with `prefers-reduced-motion`, the sequence shows at once.",
            },
        },
    },
    args: { lines: LINES, ariaLabel: "Demo", title: "Terminal" },
} satisfies Meta<typeof Terminal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Complete: Story = {};
export const Running: Story = { args: { lines: LINES.slice(0, 3), running: true } };
export const WithError: Story = {
    args: {
        lines: [
            { id: "1", kind: "command", text: "npm run build" },
            { id: "2", kind: "error", text: "Failed: invalid NEXT_PUBLIC_LOCALES variable" },
        ],
    },
};
export const ScriptedSequence: Story = { render: () => <Scripted /> };
/** Static content (`live={false}`): a named region, no role="log" / aria-live, nothing announced. */
export const Static: Story = {
    args: { live: false, title: "package.json scripts" },
    parameters: {
        docs: {
            description: {
                story: 'For content that never changes (a code sample, a listing): `live={false}` drops the live log semantics; the body stays a focusable, named `role="region"` so it can be scrolled from the keyboard.',
            },
        },
    },
};
