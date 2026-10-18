import type {Page} from '@playwright/test';
export async function acceptWelcome(page:Page){await page.locator('.welcome-enter').waitFor();await page.locator('.welcome-enter').click();await page.locator('.schedule-welcome').waitFor({state:'detached'});}
