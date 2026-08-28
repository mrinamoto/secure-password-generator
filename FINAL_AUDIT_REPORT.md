# Final Audit Report — Secure Password Generator

## Audit result

The existing Phase 1 project was audited and corrected in place. It was not replaced with an unrelated application.

## Security checks passed

- No `Math.random()` calls in application source
- Password character selection uses `crypto.getRandomValues()`
- Passphrase word and number selection use Web Crypto
- Secure random indexes use rejection sampling to avoid modulo bias
- Secure Fisher-Yates style shuffle uses secure random indexes
- Required enabled password classes are guaranteed for valid settings
- Lengths 4, 8, 12, 16, 20, 32, and 64 pass repeated invariant tests
- Similar-character and custom exclusions pass repeated tests
- Empty enabled pools fail safely with validation
- Invalid custom symbol semantics are rejected
- Generated history uses `sessionStorage`
- Generated credential values are not configured for `localStorage`
- `localStorage` persists only theme plus non-sensitive base settings
- Advanced custom exclusion/symbol text is not persisted in `localStorage`
- Analyzer input stays in component state and is not added to storage/history
- No application `fetch`, XHR, IndexedDB, cookie, URL-query, or debug-console secret path found

## Strength and entropy fixes

- Strength score is clamped to 0-4
- Entropy helpers cannot display negative, `NaN`, or `Infinity` values
- Existing credential metrics are now tied to generation-time settings instead of changing when pending settings change
- Deterministic passphrase capitalization no longer incorrectly adds entropy
- Passphrase random `00-99` option adds only its actual `log2(100)` contribution
- Crack-time wording remains approximate and includes a visible disclaimer

## UI/UX and accessibility fixes

- Improved mode semantics using pressed-state buttons instead of incomplete tab semantics
- Accessible switch semantics
- Added accessible label for numeric password-length input
- Icon-only actions retain accessible names
- Disabled empty-output actions
- Strength progressbar includes value text
- Keyboard shortcuts ignore editable controls/content-editable elements
- Added reduced-motion handling
- Long credentials remain horizontally accessible without page-level overflow
- Mobile action targets increased
- Session history lifecycle wording made more accurate
- Clipboard persistence warning made visible
- Privacy boundary remains visible in the UI

## Automated audit

Run:

```bash
npm run audit
```

The final audit script passes and checks repeated generator invariants, exclusions, passphrase behavior, multi-generation counts, storage boundaries, entropy safety, and source-level security rules.

## Syntax checks

- JS/JSX syntax transpilation: PASS
- CSS parsing: PASS

## Production dependency/build status in this execution environment

`npm install` was attempted, but the environment could not resolve `registry.npmjs.org` and returned `EAI_AGAIN`. Because dependencies could not be downloaded, `npm run build` and `npm run dev` could not find the local Vite binary in this environment.

This is an environment/network dependency-download limitation, not a detected source-code build error. On a machine with npm registry access, run:

```bash
npm install
npm run audit
npm run build
npm run dev
```

