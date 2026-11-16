import { test, expect } from "playwright/test";

test("professional jobs panel filters, sorts and edits a job", async ({ page }) => {
  await page.goto("/jobs");
  await expect(page.locator(".rh-jobs-summary")).toBeVisible();
  await expect(page.locator(".rh-job-card").first()).toBeVisible();
  const all = await page.locator(".rh-job-card").count();
  await page.getByRole("button", { name: "En pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "En pause", exact: true })).toHaveAttribute("aria-pressed", "true");
  const paused = await page.locator(".rh-job-card").count();
  expect(paused).toBeLessThanOrEqual(all);
  await page.getByRole("button", { name: "Tous", exact: true }).click();
  await expect(page.locator(".rh-job-card")).toHaveCount(all);
  await page.getByRole("combobox", { name: "Trier les postes" }).selectOption("title");
  const title = (await page.locator(".rh-job-card h2").first().textContent())?.trim();
  expect(title).toBeTruthy();
  await page.locator(".rh-job-card").first().getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByLabel("Intitulé du poste")).toHaveValue(title!);
});

test("pipeline can filter by job and move a candidate with durable history", async ({ page }) => {
  await page.goto("/pipeline");
  await expect(page.locator(".rh-pipeline-scroll")).toBeVisible();
  await expect(page.locator(".rh-pipeline-column")).toHaveCount(7);
  const original = page.locator(".rh-pipeline-card").first();
  await expect(original).toBeVisible();
  const name = (await original.locator(".rh-pipeline-person strong").textContent())?.trim();
  expect(name).toBeTruthy();
  const current = await original.getByRole("combobox", { name: /Déplacer/ }).inputValue();
  const next = current === "Screening" ? "Shortlisted" : "Screening";
  await original.getByRole("combobox", { name: /Déplacer/ }).selectOption(next);
  const destination = page.locator(".rh-pipeline-column").nth(next === "Screening" ? 1 : 2);
  await expect(destination.getByText(name!, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".rh-pipeline-column").nth(next === "Screening" ? 1 : 2).getByText(name!, { exact: true })).toBeVisible();

  const jobs = page.getByRole("combobox", { name: "Filtrer le pipeline par poste" });
  await expect(jobs).toBeVisible();
  const options = await jobs.locator("option").count();
  if (options > 1) {
    await jobs.selectOption({ index: 1 });
    await expect(jobs).not.toHaveValue("all");
  }
});
