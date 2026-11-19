// Message paths serialized to the CLIENT provider (app/[locale]/layout.tsx → pickMessages): the
// namespaces read by Client Components through `useTranslations`. Server Components read the full
// catalogue with `getTranslations` and need nothing here. tests/unit/client-messages.test.ts fails
// when a `useTranslations` call reads a namespace missing from this list. See docs/i18n.md → Client messages.
export const CLIENT_MESSAGES: readonly string[] = [
    "aiNotice",
    "comments",
    "common",
    "cookie",
    "corrector",
    "errors",
    "faq",
    "footer",
    "hero",
    "nav",
    "notFound",
    "seoContent",
    "showcase",
    "theme",
    "toolFeatures",
];
