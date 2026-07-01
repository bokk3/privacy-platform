import { test, expect } from '@playwright/test';

test.describe('Dashboard and Navigation', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate the user by mocking the network and setting local storage
        await page.route('**/api/v1/auth/me', async route => {
            await route.fulfill({
                json: { id: 'user-123', email: 'test@example.com', role: 'USER', emailVerified: true }
            });
        });

        // Mock requests list
        await page.route('**/api/v1/requests*', async route => {
            await route.fulfill({
                json: { data: [], total: 0 }
            });
        });

        // Seed domain state to trick AuthContext into thinking we are logged in
        await page.addInitScript(() => {
            window.localStorage.setItem('refreshToken', 'mock-refresh-token');
        });

        await page.goto('/dashboard');
    });

    test('should load the dashboard layout and primary navigation', async ({ page }) => {
        await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
        await expect(page.locator('nav')).toBeVisible();
    });

    test('should navigate to requests page', async ({ page }) => {
        await page.click('nav a[href="/requests"]');
        await expect(page).toHaveURL(/.*\/requests/);
        await expect(page.locator('h1', { hasText: 'Privacy Requests' })).toBeVisible();
    });

    test('should navigate to profile page', async ({ page }) => {
        await page.click('nav a[href="/profile"]');
        await expect(page).toHaveURL(/.*\/profile/);
        await expect(page.locator('h1', { hasText: 'Security' })).toBeVisible();
    });

    test('should hide admin routes for standard users', async ({ page }) => {
        // Since we mocked role: 'USER', the admin link should not exist
        await expect(page.locator('nav a[href="/admin"]')).not.toBeVisible();
    });
});
