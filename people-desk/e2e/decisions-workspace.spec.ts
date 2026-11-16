import { test, expect } from "playwright/test";

test("interviews dashboard provides completed review workflow", async ({ page }) => {
  await page.goto("/interviews");
  await expect(page.getByRole("region", {name:"Gestion des entretiens"})).toBeVisible();
  await expect(page.locator(".rh-interview-card")).toHaveCount(8);
  await page.getByRole("combobox",{name:"Trier les entretiens"}).selectOption("newest");
  const evaluate = page.getByRole("button",{name:"Évaluer"}).first();
  await expect(evaluate).toBeVisible();
  await evaluate.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox",{name:"Entretien associé"})).not.toHaveValue("");
  await dialog.getByRole("textbox",{name:/Commentaires/}).fill("Avis issu d'un entretien professionnel testé automatiquement.");
  await dialog.getByRole("button",{name:"Enregistrer"}).click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/reviews");
  await expect(page.getByText("Avis issu d'un entretien professionnel testé automatiquement.")).toBeVisible();
});

test("review edit preserves actual preexisting scores and linked interview", async ({ page }) => {
  await page.goto("/reviews");
  const firstCard = page.locator(".rh-review-card").first();
  await expect(firstCard).toBeVisible();
  const current = (await firstCard.locator(".rh-review-score-list strong").first().textContent())?.replace("/5","").trim();
  expect(current).toMatch(/^[1-5]$/);
  await firstCard.getByRole("button",{name:"Modifier"}).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox",{name:/Note : (Compétences techniques|Technical skills)/})).toHaveValue(current!);
  await dialog.getByRole("button",{name:"Annuler"}).click();
});

test("offer status transitions require manual confirmation, not email sending", async ({ page }) => {
  await page.goto("/offers");
  await expect(page.getByRole("region",{name:"Suivi des offres d'embauche"})).toBeVisible();
  await expect(page.getByText(/Aucun e-mail n’est envoyé par RH Desk/)).toBeVisible();
  const pendingOffer = page.locator(".rh-offer-card").filter({has:page.getByRole("button",{name:"Approuver l’offre"})});
  await expect(pendingOffer).toBeVisible();
  await pendingOffer.getByRole("button",{name:"Approuver l’offre"}).click();
  await expect(pendingOffer.getByRole("button",{name:"Marquer comme envoyée"})).toBeVisible();

  page.once("dialog",(dialog)=>dialog.dismiss());
  await pendingOffer.getByRole("button",{name:"Marquer comme envoyée"}).click();
  await expect(pendingOffer.getByRole("button",{name:"Marquer comme envoyée"})).toBeVisible();

  page.once("dialog",(dialog)=>dialog.accept());
  await pendingOffer.getByRole("button",{name:"Marquer comme envoyée"}).click();
  await expect(pendingOffer.getByRole("button",{name:"Marquer acceptée"})).toBeVisible();
  page.once("dialog",(dialog)=>dialog.accept());
  await pendingOffer.getByRole("button",{name:"Marquer déclinée"}).click();
  await expect(pendingOffer.getByText("Cette proposition a été déclinée.")).toBeVisible();
  await page.reload();
  await expect(page.locator(".rh-offer-card").getByText("Cette proposition a été déclinée.")).toBeVisible();
});
