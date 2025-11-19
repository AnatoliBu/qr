# QR Code Testing

## QR Code Validation Tests

This project includes automated tests to ensure QR codes are **fully visible and scannable**.

### Playwright QR Scannability Test

The `tests/e2e/qr-scannable.spec.ts` suite opens the generator, renders several QR variants and decodes the resulting preview with [`jsqr`](https://github.com/cozmo/jsQR). This keeps the entire workflow inside Node.js and mirrors how users interact with the rendered canvas.

#### Local Setup

```bash
npm install
npx playwright install
```

#### Running the scannability checks

```bash
# Run the full E2E suite (includes all test specs)
npm run test:e2e

# Or focus on the QR decoder checks only
npx playwright test tests/e2e/qr-scannable.spec.ts --project="Android-like Chromium"
```

#### What the test covers

- Default URL payloads rendered in the preview canvas
- Multiple dot styles and gradient combinations
- Non-Latin text payloads (Cyrillic and emoji)
- Guarantees that the preview canvas remains square and fully visible

All assertions rely on decoding the screenshot pixels, so if the QR code becomes cropped, blurred or otherwise unreadable, the test fails with a clear message.

### QR Scanner End-to-End Tests

The `tests/e2e/qr-scanner.spec.ts` suite tests the complete pipeline: **generating QR codes, downloading them, and scanning them back using the client-side scanner** (third tab). This ensures full integration between the generator and scanner components.

#### Running the scanner tests

```bash
# Run all scanner tests
npx playwright test tests/e2e/qr-scanner.spec.ts --project="Android-like Chromium"

# Or include in the full E2E suite
npm run test:e2e
```

#### What the scanner tests cover

**End-to-End Pipeline:**
- Generate QR → Download → Scan → Verify payload matches
- Multiple sequential scans with history tracking
- Cyrillic and emoji text payloads
- Different dot styles (square, rounded)
- Gradient-enabled QR codes
- Invalid image handling with proper error messages

**UI/UX Verification:**
- Scan results display with timestamps
- Correct icons for different sources (camera/file)
- History management (maintains chronological order)

**Compatibility Testing:**
- Different eye styles combinations (outer/inner)
- Ensures generated QR codes are scannable by the ZXing-based scanner

All scanner tests use real QR code generation followed by actual scanning through the UI, validating the complete user workflow.

## CI/CD Integration

### Automated Testing Strategy

**Test Branches (Feature Development):**
- Tests run automatically on **all branches except `test`, `main`, and `gh-pages`**
- Triggers: push to feature branches, pull requests
- Jobs:
  - `unit-tests`: TypeScript type checking + unit tests
  - `playwright`: Full E2E suite including scanner tests

**Deployment Branches:**
- `main` → Production deployment (GitHub Pages root)
- `test` → Staging deployment (GitHub Pages `/test`)
- `gh-pages` → Static hosting branch
- **No automatic tests run on these branches** (deploy-only)

### Workflow Files

**`.github/workflows/tests.yml`**
```yaml
on:
  push:
    branches-ignore:
      - test
      - main
      - gh-pages
  pull_request:
    branches-ignore:
      - test
      - main
      - gh-pages
```

This ensures tests run on feature branches for validation before merging to deployment branches.

**`.github/workflows/static.yml`**
- Runs only on `main` and `test` branches
- Handles GitHub Pages deployment

### Test Artifacts

When tests run in CI, the following artifacts are automatically saved (30 days retention):
- QR preview screenshots
- Playwright HTML report with traces
- Video recordings of test failures
- Error traces for debugging

The Playwright suite surfaces decoded payload mismatches directly in the logs, making scannability regressions easy to spot.
