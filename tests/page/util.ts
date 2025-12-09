import { expect } from "@playwright/test";

const signin = async ( page, user = process.env.MOD_USER, pass = process.env.MOD_PASS ) => {

    // Go to the signin page
    await page.goto("/account/signin");

    // Fill in form with standard user
    await page.fill("input[name='username']", user);
    await page.fill("input[name='password']", pass);

    // Submit form
    await page.click("button[type='submit']");

}

const lackPerms = async ( page, url ) => {

    // Sign in as non-admin
    await signin(page, process.env.REG_USER, process.env.REG_PASS);

    // Go to page
    await page.goto(url);

    // Expect redirect
    await expect(page).toHaveURL("/home?nopermission=true");

}

const properPerms = async ( page, url ) => {

    // Sign in as admin
    await signin(page);

    // Go to page
    await page.goto(url);

    // Expect no redirect
    await expect(page).toHaveURL(url);

}

export { signin, lackPerms, properPerms };
