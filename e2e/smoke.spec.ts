import { expect, test } from "@playwright/test";
import { gotoOs, waitForOsShell } from "./helpers";

test.describe("DevFactory OS smoke", () => {
  test("landing page loads with spawn CTA", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /Spawn your first agent/i })
    ).toBeVisible();
    await expect(page.getByText(/Orchestration you can see/i)).toBeVisible();
  });

  test("/os shows hero or workspace after boot skip", async ({ page }) => {
    await gotoOs(page, "hero");
    await waitForOsShell(page);

    const hero = page.getByRole("region", { name: "AgentOS landing" });
    const workspaceGraph = page.getByLabel("Agent orchestration graph");

    await expect(hero.or(workspaceGraph)).toBeVisible({ timeout: 15_000 });
  });

  test("DOOM demo modal choice cards stack without overlap", async ({
    page,
  }) => {
    await page.goto("/e2e-fixtures/doom-demo");

    const dialog = page.getByRole("dialog", { name: "DOOM demo" });
    await expect(dialog).toBeVisible();

    const playBtn = dialog.getByRole("button", {
      name: /Watch the agent play/i,
    });
    const buildBtn = dialog.getByRole("button", {
      name: /Watch the agent build for you/i,
    });

    await expect(playBtn).toBeVisible();
    await expect(buildBtn).toBeVisible();

    const playBox = await playBtn.boundingBox();
    const buildBox = await buildBtn.boundingBox();
    expect(playBox).not.toBeNull();
    expect(buildBox).not.toBeNull();

    const playBottom = playBox!.y + playBox!.height;
    expect(buildBox!.y).toBeGreaterThanOrEqual(playBottom - 2);

    const groupWidth = Math.max(playBox!.width, buildBox!.width);
    expect(playBox!.width).toBeGreaterThan(groupWidth * 0.85);
    expect(buildBox!.width).toBeGreaterThan(groupWidth * 0.85);
  });

  test("create-agent overlay reaches template step from dock menu", async ({
    page,
  }) => {
    await gotoOs(page, "terminal");
    await waitForOsShell(page);

    await page.getByRole("button", { name: "Spawn — quick menu" }).click();
    await page.getByRole("button", { name: "Create agent…" }).click();

    const overlay = page.getByRole("dialog", { name: /Create agent/i });
    await expect(overlay).toBeVisible();

    await overlay.getByPlaceholder("e.g. market-research").fill("e2e-smoke");
    await overlay.getByRole("button", { name: "Continue" }).click();

    await expect(overlay.getByRole("button", { name: "Templates" })).toBeVisible();
    await expect(
      overlay.getByRole("button", { name: /Planner cpu\.plan/i })
    ).toBeVisible();
  });

  test("shell status command does not crash the page", async ({ page }) => {
    await gotoOs(page, "terminal");
    await waitForOsShell(page);

    const commandInput = page.locator("#devfactory-command-input");
    await expect(commandInput).toBeVisible({ timeout: 10_000 });

    await commandInput.fill("status");
    await commandInput.press("Enter");

    await expect(page.getByRole("button", { name: "Spawn — quick menu" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("body")).not.toContainText(
      /Application error|Unhandled Runtime Error/i
    );
  });
});
