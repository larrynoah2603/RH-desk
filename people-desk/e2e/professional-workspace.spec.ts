import { test, expect } from "playwright/test";

test("professional dashboard presents real operational sections", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Le recrutement en un regard." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Répartition des candidats" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prochains entretiens" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dernières candidatures" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activité récente" })).toBeVisible();
  await expect(page.locator(".rh-overview-metric")).toHaveCount(4);
  await page.getByRole("link", { name: /Voir les candidatures/ }).click();
  await expect(page.locator(".rh-heading h1")).toHaveText("Candidatures");
});

test("candidate directory supports sorting, detail sheet and note history", async ({ page }) => {
  await page.goto("/candidates");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("combobox", { name: "Trier les candidats" }).selectOption("name");
  const firstRow = page.locator(".rh-directory-table tbody tr").first();
  const name = (await firstRow.locator(".rh-directory-person strong").textContent())?.trim();
  expect(name).toBeTruthy();
  await firstRow.getByRole("button", { name: /Voir la fiche/ }).click();
  const detail = page.getByRole("dialog", { name });
  await expect(detail).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Historique du recrutement" })).toBeVisible();
  await detail.getByLabel("Ajouter une note").fill("Contrôle E2E — note de démonstration.");
  await detail.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(detail.getByText("Contrôle E2E — note de démonstration.")).toBeVisible();
  await detail.getByRole("button", { name: "Fermer la fiche candidat" }).click();
  await expect(detail).not.toBeVisible();
  await page.reload();
  await page.getByRole("combobox", { name: "Trier les candidats" }).selectOption("name");
  await page.locator(".rh-directory-table tbody tr").first().getByRole("button", { name: /Voir la fiche/ }).click();
  await expect(page.getByRole("dialog").getByText("Contrôle E2E — note de démonstration.")).toBeVisible();
});
