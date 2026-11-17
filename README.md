# ui-sdk Combobox highlight repro

Minimal reproductions for two `@ui-sdk/react` 0.1.0-beta.7 Combobox issues:

- [vercel-labs/ui#802](https://github.com/vercel-labs/ui/issues/802): `onHighlight` isn't called when the highlighted item leaves the list.
- [vercel-labs/ui#803](https://github.com/vercel-labs/ui/issues/803): no way to set the highlighted item from code.

**Open in StackBlitz:** https://stackblitz.com/github/CarlosZiegler/ui-sdk-combobox-highlight-repro?file=src%2FApp.tsx

Or locally: `npm install && npm run dev`.

Everything is in `src/App.tsx`. Section 1 has a "Run steps automatically" button and shows the last `onHighlight` value next to the row the DOM marks as highlighted. Section 2 is a two-level list where ArrowRight/ArrowLeft swap the items, with a toggle for the synthetic-ArrowDown workaround used today.
