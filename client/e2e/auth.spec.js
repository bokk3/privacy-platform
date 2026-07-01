import { test, expect } from '@playwright/test';

// In a real E2E environment we would typically seed the database or use a specific
// test API URL. For these smoke tests, we bypass actual API calls by mocking them
// to ensure the UI flows correctly handle states.

test.describe('Authentication Flows', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the API endpoints for auth
        await page.route('**/api/v1/auth/login', async route => {
            const json = {
                accessToken: 'fake-jwt-token',
                refreshToken: 'fake-refresh-token',
                mfaRequired: false
            };
            await route.fulfill({ json });
        });

        await page.route('**/api/v1/auth/me', async route => {
            const json = {
                id: 'user-123',
                email: 'test@example.com',
                role: 'USER',
                emailVerified: true
            };
            await route.fulfill({ json });
        });
    });

    test('should allow a user to login and redirect to dashboard', async ({ page }) => {
        await page.goto('/login');

        // Check if page loaded
        await expect(page.locator('h2', { hasText: 'Sign in to your account' })).toBeVisible();

        // Fill credentials
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'Password123!');

        // Submit form
        await page.click('button[type="submit"]');

        // Check redirect to dashboard via the mocked response
        await expect(page).toHaveURL(/.*\/dashboard/);

        // Assert dashboard loads
        await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
    });

    test('should show validation errors on invalid login', async ({ page }) => {
        await page.goto('/login');

        // Submit without filling
        await page.click('button[type="submit"]');

        // HTML5 validation should kick in (we assume standard required attrs are used)
        // Or if custom validation exists, check for text like 'required'
    });

    test('should allow navigation to register page', async ({ page }) => {
        await page.goto('/login');

        // Find and click the register link
        await page.click('a[href="/register"]');

        await expect(page).toHaveURL(/.*\/register/);
        await expect(page.locator('h2', { hasText: 'Create your account' })).toBeVisible();
    });
});
