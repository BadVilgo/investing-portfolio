const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

module.exports = async (req, res) => {
  let browser;
  try {
    console.log("Starting Puppeteer...");

    // Launch Puppeteer with chrome-aws-lambda
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });

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
