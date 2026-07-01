import { chromium } from "playwright";
import { env } from "../config/env.js";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { logger } from "./logger.js";

const SCREENSHOTS_DIR = path.join(process.cwd(), "storage", "screenshots");

/**
 * Initializes the storage directory for screenshots.
 */
export async function initPlaywright() {
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Launches a browser instance.
 */
export async function launchBrowser() {
    return chromium.launch({
        headless: env.PLAYWRIGHT_HEADLESS,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
}

/**
 * Common CAPTCHA selectors on web platforms.
 */
const CAPTCHA_SELECTORS = [
    "iframe[src*='recaptcha']",
    "iframe[src*='hcaptcha']",
    "div.g-recaptcha",
    "div.h-captcha",
    "#cf-turnstile",
];

/**
 * Checks a page for the presence of CAPTCHA elements.
 */
export async function detectCaptcha(page) {
    for (const selector of CAPTCHA_SELECTORS) {
        try {
            const captcha = await page.$(selector);
            if (captcha) {
                return true;
            }
        } catch {
            // Ignore lookup errors
        }
    }
    return false;
}

/**
 * Takes a screenshot of the page and returns a local file URL or storage path.
 * Used for debugging automated worker failures.
 */
export async function captureScreenshot(page, requestId) {
    const filename = `error-${requestId}-${randomUUID().slice(0, 8)}.png`;
    const capturePath = path.join(SCREENSHOTS_DIR, filename);

    try {
        await page.screenshot({ path: capturePath, fullPage: true });
        return `/storage/screenshots/${filename}`;
    } catch (err) {
        logger.error({ err, requestId }, "Failed to capture Playwright screenshot");
        return null;
    }
}
