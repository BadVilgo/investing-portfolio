const puppeteer = require("puppeteer");

module.exports = async (req, res) => {
  let browser;
  try {
    console.log("Starting Puppeteer...");

    // Set CORS headers to allow cross-origin requests
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow requests from any origin
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

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
