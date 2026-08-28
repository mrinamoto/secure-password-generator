# Secure Password Generator

A polished, privacy-first password utility built with React and Vite. Passwords and passphrases are generated locally in the browser using the Web Crypto API. The project has no backend, no database, no account system, and no external password-generation service.

## Project Overview

Secure Password Generator provides configurable cryptographically secure password generation, local passphrase generation, strength and entropy estimates, multiple-output generation, a local password analyzer, session-only history, responsive light/dark themes, and accessibility-focused controls.

## Main Features

- Web Crypto-based password generation with `crypto.getRandomValues()`
- Rejection sampling to avoid modulo bias in secure random indexes
- Fisher-Yates style secure shuffle using Web Crypto random indexes
- Password length from 4 to 64 characters
- Uppercase, lowercase, number, and symbol controls
- Guaranteed inclusion of every enabled character class when configuration is valid
- Similar-character exclusion (`0 O o 1 l I |`)
- Custom character exclusions
- Optional custom printable-ASCII symbol set
- Heuristic strength meter with bounded score and text labels
- Pool-based password entropy estimate and approximate resistance label
- Generate 1, 3, 5, or 10 credentials independently
- Local passphrase mode using a bundled word list
- Copy individual, copy history, and copy-all actions
- Session-only generated credential history using `sessionStorage`
- Local password analyzer that never stores analyzer input
- Light and dark themes
- Keyboard shortcuts (`G` generate, `C` copy while focus is not in an editable control)
- Responsive layouts for desktop, tablet, and mobile
- Accessible labels, switches, focus states, live feedback, and strength text

## Technology Stack

- React 19
- Vite 7
- JavaScript
- Modern CSS
- Lucide React
- Web Crypto API
- `sessionStorage` for generated history
- `localStorage` only for non-sensitive preferences

## Secure Randomness

Security-sensitive random selection is centralized in `src/utils/secureRandom.js`.

`crypto.getRandomValues()` fills a `Uint32Array` using the browser's cryptographically secure random source. The generator never uses `Math.random()` for character selection, passphrase word selection, or shuffling.

### Rejection Sampling and Modulo Bias

A raw random integer modulo `N` can slightly favor some indexes when the integer range is not evenly divisible by `N`. `secureRandomIndex(maxExclusive)` calculates the largest evenly divisible portion of the 32-bit unsigned range, rejects values in the incomplete tail, and only then applies modulo.

The helper explicitly rejects unsupported ranges above `2^32` rather than risking an endless rejection loop. All application pools are far below this limit.

## Password Generation Rules

Character pools are centralized in `src/utils/passwordGenerator.js`:

- Uppercase: `A-Z`
- Lowercase: `a-z`
- Numbers: `0-9`
- Symbols: a curated printable ASCII symbol set

For every enabled category, the generator first securely selects one required character. It fills remaining positions from the combined allowed pool and then performs a secure Fisher-Yates style shuffle. This prevents required categories from always appearing in predictable positions.

The app refuses invalid configurations such as:

- no category enabled
- password length outside 4-64
- an enabled pool emptied by exclusions
- an empty enabled custom symbol set
- custom "symbols" containing letters, numbers, spaces, or emoji

## Exclusions

"Exclude similar characters" removes ambiguous values such as `0`, `O`, `o`, `1`, `l`, `I`, and `|` before generation.

Custom exclusions are also applied before selection. If exclusions empty an enabled category, generation stops and a useful validation message is shown instead of producing an invalid or empty password.

## Strength Meter

The strength meter is heuristic. It considers:

- estimated entropy
- length
- detected character diversity
- common weak patterns
- obvious alphabetic/numeric sequences
- heavy repetition

The score is always clamped to the supported 0-4 internal range and displayed with explicit text such as `Weak`, `Fair`, `Strong`, or `Very Strong`. Strength is never communicated by color alone.

The application does not claim that any password is "unbreakable", "hack-proof", or guaranteed secure.

## Entropy Estimate

For generated random passwords, the UI uses the common pool-based approximation:

`Entropy ≈ Length × log2(Character Pool Size)`

This is clearly presented as an estimate. The generator's required-category rule means the exact output distribution is more structured than a simple independent full-pool model, so the displayed value should be treated as an approximate pool-based indicator rather than a cryptographic proof.

For passphrases, the estimate is based on the number of independently selected local words. If a random two-digit number is enabled, `log2(100)` is added. Deterministic capitalization and the chosen separator do **not** add entropy.

Invalid input cannot produce `NaN`, `Infinity`, or negative displayed entropy.

## Passphrase Mode

Passphrase mode uses a bundled local word list from `src/data/wordList.js`. No dictionary API or network request is used.

Options:

- 3-8 words
- separator from 0 to 3 characters
- deterministic capitalization formatting
- optional securely generated `00-99` number

Word selection and number selection use Web Crypto-based randomness only.

## Multiple Generation

The generator can produce exactly 1, 3, 5, or 10 outputs with the same configuration. Each output independently runs the secure generation routine. Batch values can be copied individually or together.

## Password Analyzer Privacy

The analyzer works only with React component state in the current page. User-entered analyzer passwords are not:

- added to generated history
- stored in `localStorage`
- stored in `sessionStorage`
- logged
- sent to a server

Its entropy value is only a rough pool-based estimate and may overstate human-created or predictable passwords; the heuristic also checks weak patterns, sequences, and repetition.

## Storage and Privacy Boundaries

Generated credential history is stored only under:

`passwordGenerator.sessionHistory`

using `sessionStorage`.

History is limited to the latest 12 entries. Reloading the current tab normally preserves `sessionStorage`. Closing the tab ends the page session under normal browser behavior, although browser session-restore behavior can vary.

Generated credential values are **not** intentionally stored in:

- `localStorage`
- IndexedDB
- cookies
- URL query strings
- analytics
- a database
- a remote server
- console logs

`localStorage` is used only for non-sensitive preferences:

- `passwordGenerator.theme`
- `passwordGenerator.settings`, containing only length, uppercase/lowercase/number/symbol toggles, and the exclude-similar toggle

Custom exclusion text and custom symbol text are intentionally not persisted in `localStorage`; they return to defaults in a new page session. Storage reads/writes are guarded so unavailable or malformed browser storage does not crash the application.

## Clipboard Behavior

The app primarily uses `navigator.clipboard.writeText()` and contains a small fallback for browsers where the modern Clipboard API is unavailable.

Copying does not change the generated credential. The app also states in the UI that copied credentials may remain in the operating-system clipboard until replaced; browser code cannot guarantee secure clipboard erasure.

## Privacy UI

The application visibly states in the interface that:

- credentials are generated locally
- no generated credential is sent to a server
- no account or database is required
- generated history uses `sessionStorage` only

These facts are not hidden only in documentation.

## Accessibility

- Semantic headings and labeled controls
- Checkbox controls exposed as switches
- Keyboard-operable password-length slider
- Accessible name for the synchronized number input
- Visible `:focus-visible` states
- Accessible labels on icon-only buttons
- Strength meter exposes progress semantics and a text label
- Strength does not depend on color alone
- Keyboard shortcuts ignore inputs, textareas, selects, and content-editable elements
- Reduced-motion preferences are respected

## Responsive Design

The UI is designed around approximately:

- 1440px
- 1024px
- 768px
- 430px
- 375px

Long passwords and passphrases remain fully accessible through internal horizontal scrolling. The actual copied value is never truncated. Mobile layouts stack controls, enlarge action targets, wrap history metadata, and prevent page-level horizontal overflow.

## Project Structure

```text
secure-password-generator/
  scripts/
    security-audit.mjs
  src/
    components/
      PasswordAnalyzer.jsx
      SessionHistory.jsx
      StrengthMeter.jsx
      Toast.jsx
      Toggle.jsx
    data/
      wordList.js
    hooks/
      useLocalStorage.js
      useSessionStorage.js
    utils/
      entropyCalculator.js
      passphraseGenerator.js
      passwordGenerator.js
      secureRandom.js
      storageUtils.js
      strengthCalculator.js
    styles/
      app.css
      globals.css
      responsive.css
    App.jsx
    main.jsx
  index.html
  package.json
  vite.config.js
  README.md
  PROJECT_GUIDE.md
```

## Installation and Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Built-in Security Audit

A dependency-free audit script is included:

```bash
npm run audit
```

It repeatedly verifies password lengths, required categories, exclusions, empty-pool validation, passphrase options, multiple generation, secure-source scans, storage boundaries, finite entropy, and bounded strength scores.

## Security Limitations

- Strength and entropy are estimates, not guarantees.
- Exact cracking time cannot be responsibly predicted without knowing the attack model, hashing algorithm, hardware, leaks, and password reuse behavior.
- Clipboard contents may remain accessible to local applications until replaced.
- `sessionStorage` temporarily contains generated history while the page session is active.
- This tool does not replace a trusted password manager.
- The application does not perform password breach checking.
- A compromised browser, extension, device, or page environment can undermine any in-browser secret generator.

## Final Audit Notes

The final source audit removes security-sensitive uses of `Math.random()`, prevents password persistence in `localStorage`, uses secure rejection sampling and secure shuffling, validates enabled character pools, prevents invalid custom symbol semantics, keeps analyzer input memory-only, and includes automated generator/security checks.

This project is intended for GitHub, portfolio presentation, university demonstration, viva preparation, and frontend security-tool showcase use.
