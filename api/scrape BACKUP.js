let puppeteer;
let chromium;

if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // Running in a serverless environment (e.g., Vercel)
  chromium = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  // Running locally
  puppeteer = require("puppeteer");
}

module.exports = async (req, res) => {
  let browser;
  try {
    console.log("Starting Puppeteer...");

    // Launch Puppeteer
    browser = await puppeteer.launch(
      process.env.AWS_LAMBDA_FUNCTION_NAME
        ? {
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
          }
        : {
            headless: true, // Use default settings for local environment
          }
    );

    const page = await browser.newPage();

    // Set the user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
    );

    console.log("Navigating to the target URL...");
    await page.goto("https://finance.yahoo.com/quote/AAPL/", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Scroll the page to trigger lazy loading
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    console.log("Handling consent popup if present...");
    // Wait for the consent button and click it if present
    try {
      // Click "Go to end" button if it exists
      const goToEndButton = await page.$("#scroll-down-btn");
      if (goToEndButton) {
        await page.click("#scroll-down-btn");
        console.log('"Go to end" button clicked.');
      } else {
        console.log('"Go to end" button not found.');
      }

      // Click "Accept all" button if it exists
      const acceptAllButton = await page.$("button.accept-all");
      if (acceptAllButton) {
        await page.click("button.accept-all");
        console.log('"Accept all" button clicked.');
      } else {
        console.log('"Accept all" button not found.');
      }
    } catch (err) {
      console.log("Error clicking buttons:", err);
    }

    console.log("Waiting for the stock price selector...");
    await page.waitForSelector(".livePrice", { timeout: 10000 });

    console.log("Scraping the stock price...");
    const stockPrice = await page.evaluate(() => {
      const element = document.querySelector(".livePrice");
      return element ? element.innerText : null;
    });

    console.log("Closing the browser...");
    await browser.close();

    if (stockPrice) {
      console.log("Stock price found: ", stockPrice);
      res.status(200).json({ price: stockPrice });
    } else {
      console.error("Stock price not found");
      res.status(404).json({ error: "Stock price not found" });
    }
  } catch (error) {
    console.error("Error scraping data:", error);
    if (browser) await browser.close();
    res.status(500).json({
      error: "An error occurred while scraping data",
      details: error.message,
    });
  }
};
