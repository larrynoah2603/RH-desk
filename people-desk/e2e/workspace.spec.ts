import { test, expect } from "playwright/test";

test("navigates between recruitment modules", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator(".rh-heading h1")).toHaveText("Vue d’ensemble");
  await page.goto("/candidates");
  await expect(page.locator(".rh-heading h1")).toHaveText("Candidatures");
  await page.goto("/interviews");
  await expect(page.locator(".rh-heading h1")).toHaveText("Entretiens");
  await page.goto("/reports");
  await expect(page.locator(".rh-heading h1")).toHaveText("Rapports");
});

test("creates a job and keeps it after reload in demo mode", async ({ page }) => {
  await page.goto("/jobs");
  await page.getByRole("button", { name: /Ajouter/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Intitulé du poste").fill("Technicien qualité E2E");
  await dialog.getByLabel("Département").fill("Qualité");
  await dialog.getByLabel("Localisation").fill("Toamasina");
  await dialog.getByLabel("Postes à pourvoir").fill("1");
  await dialog.getByLabel("Fourchette salariale").fill("Selon profil");
  await dialog.getByLabel("Description du poste").fill("Assurer le contrôle qualité des travaux.");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Technicien qualité E2E" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Technicien qualité E2E" })).toBeVisible();
});
