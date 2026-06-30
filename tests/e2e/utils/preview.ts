import { expect, type Locator, type Page } from "@playwright/test";
import { APP_URL, getUrlInputLocator } from "./generator";

/**
 * Helpers for asserting *visible* effects of settings on the live QR preview.
 *
 * The generator renders the preview as an inline SVG (see `useQrPreview` /
 * `buildQrOptions`, `type: "svg"`). That lets us compare the rendered markup
 * before/after a setting change deterministically — no pixel snapshots, no
 * flaky timing — and assert that a given attribute (foreground color, gradient
 * defs, geometry from a margin change, dot style, …) really moved.
 */

/**
 * Open the generator and select the URL type, returning the URL input locator.
 *
 * Mirrors the canonical `openGeneratorTab` (same testids/selectors) with one
 * fix: the mode switch is a `role="tab"`, not a `button`, so we look it up as a
 * tab. The Генератор mode is selected by default anyway, so this is mostly a
 * no-op guard before selecting the URL template.
 */
export async function openGeneratorWithUrl(page: Page): Promise<Locator> {
  await page.goto(APP_URL, { waitUntil: "networkidle" });

  // The Генератор mode is selected by default, so the type picker is already
  // reachable — no mode switch needed. (The mode switch is a `role=tab`, not a
  // button, which is why the canonical helper's `button` lookup is fragile.)
  const generatorTab = page.getByRole("tab", { name: /Генератор/ }).first();
  await generatorTab.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  await generatorTab.click().catch(() => {});

  const urlTemplate = page.getByTestId("qr-template-url").first();
  await expect(urlTemplate).toBeVisible({ timeout: 30_000 });
  await urlTemplate.click();

  const urlInput = getUrlInputLocator(page);
  await expect(urlInput).toBeVisible({ timeout: 30_000 });
  return urlInput;
}

/** Locator for the container the qr-code-styling instance renders into. */
export function getPreviewContainer(page: Page): Locator {
  return page.locator('[class*="qrCanvas"]').first();
}

/** Locator for the rendered preview SVG itself. */
export function getPreviewSvg(page: Page): Locator {
  return getPreviewContainer(page).locator("svg").first();
}

/**
 * Wait until the preview SVG has actually rendered QR modules. The instance is
 * appended empty and filled asynchronously after `update()`; we treat "has a
 * non-trivial markup length" as ready.
 */
export async function waitForPreviewRendered(page: Page): Promise<void> {
  const svg = getPreviewSvg(page);
  await expect(svg).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => (await readPreviewMarkup(page)).length, {
      timeout: 30_000,
      message: "preview SVG should contain rendered QR markup"
    })
    .toBeGreaterThan(200);
}

/** Read the current preview SVG outer markup. */
export async function readPreviewMarkup(page: Page): Promise<string> {
  const svg = getPreviewSvg(page);
  return (await svg.evaluate((el) => el.outerHTML)) ?? "";
}

/**
 * Wait until the preview markup differs from `previous`. Returns the new
 * markup. Deterministic: polls the actual DOM rather than sleeping.
 */
export async function waitForPreviewChange(page: Page, previous: string): Promise<string> {
  await expect
    .poll(async () => readPreviewMarkup(page), {
      timeout: 30_000,
      message: "preview markup should change after the setting changes"
    })
    .not.toBe(previous);
  return readPreviewMarkup(page);
}

/**
 * Set a native <input type="color"> value the way a user would: assign the
 * value and dispatch the `input`/`change` events React listens for. A bare
 * `el.value = …` does NOT notify React's synthetic handler.
 */
export async function setColorInput(input: Locator, hex: string): Promise<void> {
  await input.evaluate((el, value) => {
    const node = el as HTMLInputElement;
    // React tracks the input's value via a hidden value-tracker; assigning
    // through the native prototype setter is what makes its synthetic onChange
    // fire. A plain `node.value = …` is silently swallowed.
    const proto = Object.getPrototypeOf(node) as object;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(node, value);
    else node.value = value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }, hex);
}
