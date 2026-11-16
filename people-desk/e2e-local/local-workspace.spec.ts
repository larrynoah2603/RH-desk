import { test, expect } from "playwright/test";

const email = process.env.RH_LOCAL_ADMIN_EMAIL || "admin@example.test";
const password = process.env.RH_LOCAL_TEST_PASSWORD || "";

test("local server rejects unauthenticated data requests", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ status: "ok", mode: "local" });

  const anonymous = await request.get("/api/workspace");
  expect(anonymous.status()).toBe(401);

  const crossSite = await request.put("/api/workspace", {
    headers: { Origin: "https://attacker.invalid" },
    data: { revision: 0, data: {} },
  });
  expect(crossSite.status()).toBe(403);
});

test("local administrator signs in, persists a job, then signs out", async ({ page }) => {
  expect(password).toBeTruthy();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Connexion à RH Desk" })).toBeVisible();
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page.locator(".rh-heading h1")).toHaveText("Vue d’ensemble");
  await expect(page.getByText(/Serveur local|Local server/)).toBeVisible();

  await page.goto("/jobs");
  await expect(page.locator(".rh-heading h1")).toHaveText("Postes ouverts");
  await page.locator(".rh-heading").getByRole("button", { name: "Ajouter" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel(/Intitulé du poste/).fill("Technicien local");
  await modal.getByLabel(/Département/).fill("Informatique");
  await modal.getByLabel(/Localisation/).fill("Toamasina");
  await modal.getByLabel(/Postes à pourvoir/).fill("1");
  await modal.getByLabel(/Fourchette salariale/).fill("Selon profil");
  await modal.getByLabel(/Description du poste/).fill("Responsable du support informatique local.");
  await modal.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Technicien local" })).toBeVisible();

  // Wait until the asynchronous disk write has finished.
  await expect(page.getByText(/Serveur local|Local server/)).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Technicien local" })).toBeVisible();

  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page.getByRole("heading", { name: "Connexion à RH Desk" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Connexion à RH Desk" })).toBeVisible();
});
