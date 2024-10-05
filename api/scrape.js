const puppeteer = require("puppeteer");

module.exports = async (req, res) => {
  let browser;
  try {
    console.log("Starting Puppeteer...");

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true, // Set to true for production on Vercel
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for serverless environments
    });

    const page = await browser.newPage();

    // Set the user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
    );

    console.log("Navigating to the target URL...");
    // Navigate to the target URL
    await page.goto("https://finance.yahoo.com/quote/AAPL/", {
      waitUntil: "domcontentloaded",
      timeout: 30000, // 30 seconds timeout
    });

    console.log("Waiting for the stock price selector...");
    // Wait for the specific selector to load
    await page.waitForSelector(".livePrice", { timeout: 10000 }); // Wait up to 10 seconds

    console.log("Scraping the stock price...");
    // Scrape the stock price
    const stockPrice = await page.evaluate(() => {
      return document.querySelector(".livePrice").innerText;
    });

    console.log("Closing the browser...");
    // Close the browser
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
