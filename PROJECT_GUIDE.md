# Secure Password Generator — Project Guide

This guide explains the final audited project in beginner-friendly language. It is written for understanding the code, university demonstration, and viva preparation.

## 1. Project overview

Secure Password Generator is a frontend-only React application that creates passwords and passphrases inside the user's browser. It uses the Web Crypto API for security-sensitive randomness and never needs a password-generation backend.

## 2. Problem it solves

People often create short, reused, or predictable passwords. This project creates random credentials with configurable rules while keeping generated values local to the browser and providing clear privacy/security feedback.

## 3. Main features

- Secure password generation
- Password length 4-64
- Uppercase, lowercase, numbers, and symbols
- Required-character-class guarantee
- Similar-character exclusion
- Custom exclusions
- Custom symbol set
- Passphrase mode
- Strength and entropy estimates
- Generate 1, 3, 5, or 10 credentials
- Copy and copy-all actions
- Session-only generated history
- Local password analyzer
- Light/dark theme
- Responsive layout
- Accessibility support
- Keyboard shortcuts

## 4. Technologies used

- React
- Vite
- JavaScript
- Modern CSS
- Lucide React
- Web Crypto API
- `sessionStorage`
- `localStorage` only for non-sensitive preferences

## 5. Why React

React is useful for interactive state. Settings, generated output, strength information, history, theme, visibility, passphrase options, and analyzer input can all update without reloading the page.

## 6. Why Vite

Vite provides a fast development server and a production bundling workflow with simple commands such as `npm run dev` and `npm run build`.

## 7. Why there is no backend

Password generation does not require a server. A backend would add unnecessary complexity and would create a risk that generated secrets might be transmitted. This project deliberately generates credentials in the browser.

## 8. Why credentials are generated locally

A password is sensitive information. Local generation allows the browser to create the value without sending it to an application server or an external password API.

## 9. What the Web Crypto API is

The Web Crypto API is a browser security API. This project uses `crypto.getRandomValues()` to obtain cryptographically strong random integers from the platform.

## 10. Why `Math.random()` is avoided

`Math.random()` is designed for normal application randomness, not cryptographic secrets. Password characters, passphrase words, random numbers, and shuffling therefore use Web Crypto instead.

The final audit script also scans application source and fails if a `Math.random()` call appears.

## 11. How `crypto.getRandomValues()` works conceptually

The application creates a typed array such as `Uint32Array(1)`. The browser fills it with a cryptographically strong unsigned integer. The application then converts that integer into a valid index for a character pool or word list.

## 12. Secure random index

`src/utils/secureRandom.js` contains `secureRandomIndex(maxExclusive)`.

It returns a secure integer in this range:

`0 <= index < maxExclusive`

The helper validates its input and refuses unsupported ranges above `2^32` instead of risking incorrect behavior.

## 13. What modulo bias is

Suppose a random integer range is not exactly divisible by the number of choices. Directly using:

`randomValue % numberOfChoices`

can make some indexes slightly more likely than others. This is called modulo bias.

## 14. Rejection sampling

The project calculates the largest part of the 32-bit unsigned range that is evenly divisible by the number of choices. Random values in the incomplete tail are rejected and regenerated. Only then is modulo used.

This makes character and word indexes approximately uniform.

## 15. Character pools

Password character pools are centralized in `src/utils/passwordGenerator.js`:

- uppercase: `A-Z`
- lowercase: `a-z`
- numbers: `0-9`
- symbols: a curated printable ASCII symbol set

Keeping them centralized avoids duplicated security-sensitive strings throughout UI components.

## 16. Uppercase logic

When uppercase is enabled, the uppercase pool is included and at least one uppercase character is securely selected before remaining positions are filled.

## 17. Lowercase logic

When lowercase is enabled, the same guarantee is applied to the `a-z` pool.

## 18. Number logic

When numbers are enabled, at least one digit is selected from `0-9` for every valid generated password.

## 19. Symbol logic

Symbols use either the default symbol pool or the custom symbol set. Custom symbols are restricted to printable ASCII punctuation so enabling "Symbols" cannot accidentally mean letters, numbers, spaces, or emoji.

## 20. Similar-character exclusion

When enabled, the application removes visually ambiguous characters such as:

`0 O o 1 l I |`

from applicable pools before generation.

## 21. Custom character exclusion

Users may specify additional characters to remove. Exclusions are applied before selection. If an enabled pool becomes empty, validation stops generation and shows a useful error.

## 22. Password-length validation

Password length must be an integer between 4 and 64.

The generator also validates the enabled categories. It never silently generates an empty or invalid password when required character pools are unavailable.

## 23. Required-character-class guarantee

For every enabled category, the generator first selects one secure random character from that category. Remaining positions are filled from the combined allowed pool.

This prevents an enabled category from disappearing by random chance.

## 24. Secure shuffle

After all characters are selected, `secureShuffle()` performs a Fisher-Yates style shuffle.

For each position it uses `secureRandomIndex()` to select the swap position. The project does **not** use:

`array.sort(() => Math.random() - 0.5)`

The shuffle prevents required-category characters from always appearing in predictable positions.

## 25. Password strength calculation

`src/utils/strengthCalculator.js` uses both entropy and practical heuristics.

It considers:

- estimated entropy
- password length
- detected category diversity
- common weak patterns
- alphabetic/numeric sequences
- repeated characters

The internal score is clamped to 0-4 so it cannot become negative or exceed the expected maximum.

## 26. Entropy formula

For generated random passwords, the UI uses the common approximation:

`Entropy ≈ Length × log2(Character Pool Size)`

This is a pool-based estimate, not a proof of exact security. The required-category generation rule makes the exact distribution more structured than a simple independent full-pool model.

## 27. Passphrase entropy

Passphrase entropy is estimated from independent random word selection:

`Word Count × log2(Local Word List Size)`

If the optional two-digit number is enabled, the app adds:

`log2(100)`

because the number is randomly selected from `00-99`.

Capitalization and separators are deterministic formatting options in this app, so they do **not** add entropy.

## 28. Entropy safety checks

Entropy helpers reject invalid numeric situations by returning `0` instead of displaying `NaN`, `Infinity`, or negative values.

## 29. Limitations of strength estimates

A browser UI cannot know the real attack environment. Real security depends on factors such as:

- password hashing algorithm
- attacker hardware
- rate limiting
- credential reuse
- phishing
- leaks or malware
- how randomly the credential was generated

Therefore the app uses labels such as `Strong` and `Very Strong`, not claims such as "unbreakable" or "hack-proof".

## 30. Estimated resistance and crack-time wording

The UI uses broad labels such as `Low`, `Moderate`, `High`, and `Very High`.

It intentionally avoids fake statements such as "exactly 14 billion years to crack." A visible note explains that cracking time depends on attack method, hashing algorithm, hardware, leaks, reuse, and randomness.

## 31. Copy-to-clipboard

The main copy method is:

`navigator.clipboard.writeText(value)`

A simple fallback is used if the modern Clipboard API is unavailable.

Copying never regenerates or changes the credential. The UI warns that copied secrets may remain in the operating-system clipboard until replaced.

## 32. Why clipboard erasure is not promised

Browser JavaScript cannot guarantee secure deletion of the operating-system clipboard. The application therefore does not claim that it can automatically erase copied passwords safely.

## 33. `sessionStorage`

Generated history uses:

`passwordGenerator.sessionHistory`

inside `sessionStorage`.

`sessionStorage` normally survives reloads in the same tab and ends with the page session. Browser session-restore behavior can vary, so the documentation avoids stronger guarantees than the browser provides.

## 34. Why generated history is not permanent

Generated passwords are secrets. Persisting them in long-lived browser storage would increase exposure. The application therefore limits history to 12 entries and stores it only in `sessionStorage`.

## 35. `localStorage`

Only non-sensitive preferences use `localStorage`:

- `passwordGenerator.theme`
- `passwordGenerator.settings` with password length, category toggles, and exclude-similar only

Generated credential values do not use `localStorage`. Custom exclusion text and custom symbol text are also intentionally not persisted there.

Storage access is guarded with `try/catch` so unavailable browser storage or malformed JSON does not crash the application.

## 36. Multiple password generation

Users may generate exactly:

- 1
- 3
- 5
- 10

credentials with the same settings. Every output independently calls the secure generator.

## 37. Passphrase mode

Passphrase mode securely selects 3-8 words from `src/data/wordList.js`.

Options include:

- word count
- separator
- deterministic capitalization
- optional secure two-digit number

No external dictionary API is used.

## 38. Password analyzer privacy

The analyzer stores its input only in local React component state while the page is open.

Analyzer input is not:

- added to generated history
- written to `localStorage`
- written to `sessionStorage`
- logged
- sent through a network request

Its entropy display is only a rough pool-based estimate and can overstate predictable human-created passwords.

## 39. Theme system

The interface supports light and dark themes. Theme is non-sensitive and is allowed to persist in `localStorage`.

## 40. Responsive design

The layout targets approximately:

- 1440px
- 1024px
- 768px
- 430px
- 375px

Desktop uses a generator plus security insight column. Smaller screens stack the layout. Long generated values use internal horizontal scrolling so the full credential remains accessible without causing page overflow.

## 41. Accessibility

The audited UI includes:

- semantic headings
- labeled inputs
- switches with `role="switch"`
- keyboard-operable range input
- visible focus states
- accessible names on icon-only buttons
- strength text in addition to visual meter
- progressbar semantics
- keyboard shortcuts disabled while typing in inputs, textareas, selects, or content-editable areas
- reduced-motion support

## 42. Project structure

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

## 43. Important components

- `App.jsx` — main state, generation workflow, copy actions, theme, mode, history integration
- `StrengthMeter.jsx` — strength, entropy, resistance UI
- `SessionHistory.jsx` — temporary history list and actions
- `PasswordAnalyzer.jsx` — memory-only analyzer input and local analysis
- `Toggle.jsx` — reusable accessible switch
- `Toast.jsx` — non-blocking feedback

## 44. Important utility functions

- `secureRandomIndex()` — unbiased Web Crypto index
- `secureChoice()` — secure selection from string/array
- `secureShuffle()` — secure Fisher-Yates shuffle
- `buildPools()` — applies settings and exclusions
- `validatePasswordSettings()` — validates generation rules
- `generatePassword()` — creates final password
- `validatePassphraseSettings()` — validates passphrase controls
- `generatePassphrase()` — selects local words securely
- `estimatePasswordEntropy()` — password entropy estimate
- `estimatePassphraseEntropy()` — passphrase entropy estimate
- `analyzeStrength()` — bounded heuristic strength score
- `readStorage()` / `writeStorage()` — guarded browser storage helpers

## 45. Important React hooks

- `useState` manages interactive UI state.
- `useEffect` applies theme, cleans toast timers, and registers keyboard shortcuts.
- `useLocalStorage` persists only approved non-sensitive preferences.
- `useSessionStorage` persists temporary generated history for the current page session.

## 46. How to run

```bash
npm install
npm run dev
```

## 47. How to build

```bash
npm run build
npm run preview
```

## 48. How to run the built-in security audit

```bash
npm run audit
```

The script repeatedly checks:

- source has no `Math.random()` call
- source has no debug `console.log`/`console.debug`/`console.info`
- generated lengths 4, 8, 12, 16, 20, 32, 64
- required character categories
- category-only generation
- similar-character exclusion
- custom exclusions
- empty-pool errors
- custom-symbol validation
- secure index bounds
- passphrase 3/4/6 words
- separator behavior
- capitalization behavior
- secure two-digit number
- deterministic capitalization does not add entropy
- exact multi-generation counts 1/3/5/10
- finite non-negative entropy
- strength remains inside 0-4
- session history uses `sessionStorage`
- generated history is not configured through `localStorage`

## 49. How to change default password length

Open `src/App.jsx` and edit `DEFAULT_SETTINGS.length`. Keep it between 4 and 64.

## 50. How to change the default symbol list

Open `src/utils/passwordGenerator.js` and edit `CHARACTER_POOLS.symbols`. Keep symbols compatible with the validation rules.

## 51. How to change theme colors

Open `src/styles/globals.css`.

- Light theme variables are in `:root`.
- Dark theme variables are in `:root[data-theme="dark"]`.

## 52. Common errors and fixes

### `npm` command not found
Install a current Node.js version and reopen the terminal.

### Generator says no character type is selected
Enable at least one of uppercase, lowercase, numbers, or symbols.

### Generator says a character pool is empty
Reduce custom exclusions or correct the custom symbol set.

### Custom symbol set is rejected
Use printable ASCII punctuation only. Do not put letters, numbers, spaces, or emoji in the custom symbol field.

### Clipboard does not work
Modern Clipboard API access may require HTTPS or localhost. The project includes a basic fallback, but browser security policy can still block copy operations.

### `npm install` cannot reach the registry
Check internet/DNS/proxy/firewall settings and retry. This is a package-download problem rather than generator logic.

## 53. Security limitations

- Strength and entropy are estimates.
- Pool-based entropy is not a guarantee of actual attack resistance.
- Clipboard content is outside the app's full control.
- `sessionStorage` temporarily contains generated history while the page session is active.
- A compromised browser, extension, or operating system can expose secrets generated in a browser.
- The app does not check breach databases.
- The app does not replace a trusted password manager.

# Viva Questions and Answers

### 1. What is a password generator?
A password generator creates passwords automatically according to selected rules such as length and allowed character types.

### 2. Why does this project use Web Crypto?
Because password generation needs cryptographically strong randomness, not ordinary application randomness.

### 3. Why is `Math.random()` unsuitable?
It is not designed for cryptographic secrets and can be predictable enough to be inappropriate for password generation.

### 4. What is `crypto.getRandomValues()`?
It is a browser API that fills typed arrays with cryptographically strong random values.

### 5. What is `secureRandomIndex()`?
It converts a Web Crypto random integer into a valid unbiased index for a character pool or word list.

### 6. What is modulo bias?
It is unequal probability caused when a random integer range is mapped to a smaller range with modulo and the ranges do not divide evenly.

### 7. How does rejection sampling reduce modulo bias?
It rejects random values from the incomplete tail before applying modulo, leaving an evenly divisible range.

### 8. What is a character pool?
It is a set of allowed characters such as uppercase letters, lowercase letters, numbers, or symbols.

### 9. Why guarantee one character from every enabled category?
Because pure random selection could accidentally omit an enabled category even when the user expected it to be present.

### 10. What happens if no character category is enabled?
Validation stops generation and asks the user to select at least one character type.

### 11. What happens if exclusions remove an enabled pool?
Generation stops with an error instead of producing an invalid or empty password.

### 12. What are similar characters?
Examples are `0/O/o` and `1/l/I`, which can be visually confusing.

### 13. Why exclude similar characters?
It makes passwords easier to read and type manually when necessary.

### 14. What is a custom symbol set?
It lets the user choose the punctuation symbols allowed in generated passwords.

### 15. Why are custom symbols limited to printable ASCII punctuation?
It keeps the "Symbols" category semantically correct and avoids letters, numbers, spaces, emoji, and Unicode length edge cases.

### 16. What is secure shuffling?
It randomizes character positions using secure random indexes after required characters are selected.

### 17. Which shuffle algorithm is used conceptually?
A Fisher-Yates style shuffle using `secureRandomIndex()` for swap positions.

### 18. What is entropy?
Entropy is an estimate of uncertainty or the number of possible random outcomes.

### 19. What password entropy formula is shown?
Approximately `Length × log2(Character Pool Size)`.

### 20. Is the displayed password entropy exact?
No. It is a pool-based estimate and the real output distribution and attack environment are more complicated.

### 21. How is passphrase entropy estimated?
From random word count and local dictionary size, plus `log2(100)` if the random two-digit number option is enabled.

### 22. Does capitalization add passphrase entropy here?
No. Capitalization is deterministic formatting in this implementation, so it does not add randomness.

### 23. Why can the strength score never exceed the expected range?
The calculator explicitly clamps the internal score between 0 and 4.

### 24. What else does the strength calculator check besides entropy?
It checks length, character diversity, common weak patterns, obvious sequences, and repetition.

### 25. Why does the app avoid exact crack-time claims?
Cracking speed depends on hashing algorithm, hardware, attack method, leaks, rate limits, and many unknown conditions.

### 26. What is `sessionStorage`?
It is browser storage scoped to a page session/tab and normally survives reloads in that same tab.

### 27. Why use `sessionStorage` for generated history?
It is temporary and avoids long-lived persistence of generated credentials.

### 28. Why not use `localStorage` for generated passwords?
`localStorage` persists longer and would unnecessarily increase exposure of sensitive generated values.

### 29. What is stored in `localStorage`?
Only non-sensitive preferences: theme, password length, category toggles, and exclude-similar.

### 30. Does this application use a database?
No. It is frontend-only and uses no database.

### 31. Does this application send generated passwords to a server?
No. Generated credentials stay in the browser unless the user manually copies and uses them elsewhere.

### 32. How does copy-to-clipboard work?
The app primarily uses `navigator.clipboard.writeText()` with a basic fallback for limited environments.

### 33. Can the application guarantee clipboard deletion?
No. Browser code cannot reliably guarantee secure erasure of the operating-system clipboard.

### 34. What is passphrase mode?
It securely selects several words from a bundled local word list and optionally adds formatting and a random two-digit number.

### 35. Does passphrase mode call an external API?
No. The word list is bundled with the project.

### 36. What is multiple generation?
It generates exactly 1, 3, 5, or 10 independent credentials using the same settings.

### 37. Does the analyzer save the password I type?
No. Analyzer input remains in React component state and is not stored in history or browser storage by the app.

### 38. Why can analyzer entropy overestimate security?
A typed human password may follow predictable patterns even if it uses many character types. Pool-size math alone cannot fully measure human predictability.

### 39. How do keyboard shortcuts avoid interfering with typing?
The listener ignores events when focus is inside inputs, textareas, selects, or content-editable elements.

### 40. How is long-password mobile overflow handled?
The credential stays in an internal horizontally scrollable area instead of overflowing the whole page or truncating the copied value.

### 41. How is strength made accessible?
The app displays text labels and exposes progressbar semantics instead of relying on color alone.

### 42. Why are browser storage operations wrapped safely?
Storage can be unavailable, malformed, or restricted. Guarded reads/writes prevent those conditions from crashing the app.

### 43. What does `npm run audit` do?
It runs dependency-free automated checks for generator invariants, storage boundaries, exclusions, entropy safety, and source-level security rules.

### 44. Why is this project frontend-only?
Secure credential generation can be done locally, avoiding unnecessary transmission and server storage of passwords.

### 45. What are the main limitations?
Strength values are estimates, clipboard exposure is not fully controllable, session history temporarily stores generated credentials, and a compromised browser/device can undermine local generation.
