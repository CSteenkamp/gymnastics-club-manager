const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Wait a bit for server to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Navigate to the login page first
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot of login page
    await page.screenshot({ path: 'login-page.png', fullPage: true });
    console.log('Login page screenshot saved');
    
    // Try to use the demo account first
    console.log('Clicking Administrator demo account...');
    await page.click('text=Administrator');
    
    // If that doesn't work, try manual login
    await page.waitForTimeout(2000);
    if (await page.url().includes('login')) {
      console.log('Demo login failed, trying manual login...');
      await page.fill('input[placeholder="Enter your email"]', 'admin@ceresgymnastics.co.za');
      await page.fill('input[placeholder="Enter your password"]', 'password123');
      await page.click('button:has-text("Sign in")');
    }
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('Current URL after login:', page.url());
    
    // Navigate to classes page
    await page.goto('http://localhost:3000/admin/classes');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot of the classes page
    await page.screenshot({ path: 'classes-page.png', fullPage: true });
    
    console.log('Screenshots saved: login-page.png and classes-page.png');
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-page.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();