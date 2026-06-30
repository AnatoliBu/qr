import { test, expect, type Page } from "@playwright/test";
import { setupGeneratorPage } from "./utils/generator";
import {
  openGeneratorWithUrl,
  readPreviewMarkup,
  setColorInput,
  waitForPreviewChange,
  waitForPreviewRendered
} from "./utils/preview";

/**
 * PHASE 2b — per-setting visible effects + flows (REQUIREMENTS §7).
 *
 * Each test asserts that a setting change *visibly* moves the rendered preview
 * (the live SVG markup), that Save surfaces the `✓ QR сохранён` toast, and that
 * the readability chip reads ✅ for a sane config and ⚠️ for a deliberately
 * unreadable one. The preview is an inline SVG, so we compare its markup
 * before/after instead of pixel snapshots — deterministic, no flaky sleeps.
 */

const READABILITY_CHIP = '[role="status"]:has-text("Читается"), [role="status"]:has-text("Плохо читается")';

test.beforeEach(async ({ page }, testInfo) => {
  await setupGeneratorPage(page, testInfo);
});

test.describe("Settings visibly change the preview", () => {
  test.use({ storageState: undefined });

  async function seedUrl(page: Page) {
    const urlInput = await openGeneratorWithUrl(page);
    await urlInput.fill("https://example.com/settings");
    await waitForPreviewRendered(page);
  }

  async function openStyleTab(page: Page) {
    await page.getByRole("button", { name: "🎨 Стиль" }).click();
  }

  async function openAdvancedTab(page: Page) {
    await page.getByRole("button", { name: "⚙️ Продвинутые" }).click();
  }

  test("foreground color change updates the rendered QR", async ({ page }) => {
    await seedUrl(page);
    await openStyleTab(page);

    const before = await readPreviewMarkup(page);
    expect(before.toLowerCase()).toContain("#000000");

    // First color input in the "Цветовая схема" group is the foreground.
    const fgInput = page.locator('input[type="color"]').first();
    await setColorInput(fgInput, "#ff5733");

    const after = await waitForPreviewChange(page, before);
    expect(after.toLowerCase()).toContain("#ff5733");
  });

  test("dot style change updates the rendered QR", async ({ page }) => {
    await seedUrl(page);
    await openStyleTab(page);

    const before = await readPreviewMarkup(page);

    const dotStyleSelect = page
      .locator("text=Стиль точек")
      .locator("..")
      .locator("select");
    await dotStyleSelect.selectOption("dots");

    const after = await waitForPreviewChange(page, before);
    expect(after).not.toBe(before);
  });

  test("margin 8% vs 0% changes the rendered QR geometry", async ({ page }) => {
    await seedUrl(page);
    await openAdvancedTab(page);

    // Default margin is 8% — capture, then drop to 0 (QR fills edge-to-edge).
    const marginNumber = page.locator('input[type="number"]').first();
    await expect(marginNumber).toHaveValue("8");

    const atDefault = await readPreviewMarkup(page);

    await marginNumber.fill("0");
    await marginNumber.dispatchEvent("change");

    const atZero = await waitForPreviewChange(page, atDefault);
    expect(atZero).not.toBe(atDefault);
    await expect(marginNumber).toHaveValue("0");
  });

  test("enabling the dots gradient injects a gradient into the QR", async ({ page }) => {
    await seedUrl(page);
    await openStyleTab(page);

    const before = await readPreviewMarkup(page);
    expect(before.toLowerCase()).not.toContain("<lineargradient");

    // First "Использовать градиент" checkbox is the dots gradient.
    const gradientCheckbox = page
      .locator('label:has-text("Использовать градиент")')
      .locator('input[type="checkbox"]')
      .first();
    await gradientCheckbox.check();

    const after = await waitForPreviewChange(page, before);
    expect(after.toLowerCase()).toMatch(/<(linear|radial)gradient/);
  });
});

test.describe("Save flow", () => {
  test.use({ storageState: undefined });

  test("save action shows the '✓ QR сохранён' toast", async ({ page }) => {
    const urlInput = await openGeneratorWithUrl(page);
    await urlInput.fill("https://example.com/save");
    await waitForPreviewRendered(page);

    await page.getByRole("button", { name: "⬇️ Скачать QR" }).click();

    await expect(page.getByText("✓ QR сохранён")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Readability preflight chip", () => {
  test.use({ storageState: undefined });

  test("shows ✅ for a normal high-contrast config", async ({ page }) => {
    const urlInput = await openGeneratorWithUrl(page);
    await urlInput.fill("https://example.com/readable");
    await waitForPreviewRendered(page);

    const chip = page.locator(READABILITY_CHIP).first();
    await expect(chip).toContainText("✅ Читается", { timeout: 30_000 });
  });

  test("flips to ⚠️ for a deliberately unreadable zero-contrast config", async ({ page }) => {
    const urlInput = await openGeneratorWithUrl(page);
    await urlInput.fill("https://example.com/unreadable");
    await waitForPreviewRendered(page);

    // Sanity: starts readable.
    const chip = page.locator(READABILITY_CHIP).first();
    await expect(chip).toContainText("✅ Читается", { timeout: 30_000 });

    await page.getByRole("button", { name: "🎨 Стиль" }).click();

    // Collapse contrast to zero: foreground == background → the modules are
    // invisible and the preflight decoder can no longer recover the payload,
    // so the chip must warn.
    const colorInputs = page.locator('input[type="color"]');
    await setColorInput(colorInputs.nth(0), "#ffffff"); // foreground
    await setColorInput(colorInputs.nth(1), "#ffffff"); // background

    await expect(chip).toContainText("Плохо читается", { timeout: 30_000 });
  });
});
