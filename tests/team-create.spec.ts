import { test, expect } from '@playwright/test';

test.describe('Team Creation', () => {
  test('user can create a team with a selected sport', async ({ page }) => {
    // Note: This test assumes you have a way to authenticate
    // You might need to add authentication setup here or use a test helper

    // Navigate to team page
    await page.goto('http://localhost:3000/dashboard/team');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Fill in team name
    await page.getByLabel('Team name').fill('Mi Equipo de Prueba');

    // Select sport from dropdown
    await page.getByText('Select a sport').click();
    await page.getByRole('option', { name: /Soccer/i }).click();

    // Submit the form
    await page.getByRole('button', { name: /Create Team/i }).click();

    // Wait for navigation or success
    await page.waitForURL(/\/dashboard\/team/);

    // Verify the new team appears on the page
    await expect(page.getByText(/Mi Equipo de Prueba/i)).toBeVisible();
  });

  test('form validates required sport selection', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/team');
    await page.waitForLoadState('networkidle');

    // Fill team name only
    await page.getByLabel('Team name').fill('Test Team');

    // Try to submit without selecting sport
    const submitButton = page.getByRole('button', { name: /Create Team/i });

    // Button should be disabled without sport selection
    // (This depends on your form's client-side validation)
    await expect(submitButton).toBeDisabled();
  });

  test('displays error when team creation fails', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/team');
    await page.waitForLoadState('networkidle');

    // Fill in form
    await page.getByLabel('Team name').fill('T'); // Too short
    await page.getByText('Select a sport').click();
    await page.getByRole('option', { name: /Soccer/i }).click();

    // Submit form
    await page.getByRole('button', { name: /Create Team/i }).click();

    // Should show validation error
    await expect(page.locator('text=/Team name must be/i')).toBeVisible();
  });
});

test.describe('Team Creation with different sports', () => {
  const sports = ['Soccer', 'Basketball', 'Volleyball', 'Rugby', 'Golf'];

  for (const sport of sports) {
    test(`can create team with ${sport}`, async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard/team');
      await page.waitForLoadState('networkidle');

      await page.getByLabel('Team name').fill(`${sport} Team`);
      await page.getByText('Select a sport').click();
      await page.getByRole('option', { name: new RegExp(sport, 'i') }).click();
      await page.getByRole('button', { name: /Create Team/i }).click();

      await page.waitForURL(/\/dashboard\/team/);
      await expect(page.getByText(new RegExp(`${sport} Team`, 'i'))).toBeVisible();
    });
  }
});
