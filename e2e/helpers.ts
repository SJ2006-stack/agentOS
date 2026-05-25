import type { Page } from "@playwright/test";

export type OsUiMode = "hero" | "terminal" | "desktop" | "workspace";

export async function seedOsSession(
  page: Page,
  mode: OsUiMode = "terminal"
): Promise<void> {
  await page.addInitScript((uiMode) => {
    localStorage.setItem("agentos-hero-boot", "0");
    localStorage.setItem("devfactory-ui-mode", uiMode);
    localStorage.setItem("devfactory-workspace-first-run-dismissed", "1");
  }, mode);
}

export async function skipBootIfVisible(page: Page): Promise<void> {
  const skipBoot = page.getByRole("button", { name: /Skip boot/i });
  if (await skipBoot.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipBoot.click();
  }
}

export async function gotoOs(
  page: Page,
  mode: OsUiMode = "terminal"
): Promise<void> {
  await seedOsSession(page, mode);
  await page.goto("/os");
  await skipBootIfVisible(page);
}

export async function waitForOsShell(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Spawn — quick menu" })
    .waitFor({ state: "visible", timeout: 15_000 });
}
