const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const production = process.env.NODE_ENV === "production";

const getLocalChromePath = () => {
  switch (process.platform) {
    case "win32":
      return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    case "linux":
      return "/usr/bin/google-chrome";
    case "darwin": // macOS
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    default:
      throw new Error("Unsupported platform: " + process.platform);
  }
};

module.exports = async (req, res) => {
  let browser;
  try {
    console.log("Starting Puppeteer...");

    // Launch Puppeteer with conditional settings for production and local environments
    browser = await puppeteer.launch(
      production
        ? {
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: "new",
            ignoreHTTPSErrors: true,
          }
        : {
            headless: "new",
            executablePath: getLocalChromePath(), // Use platform-specific executable path
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
    try {
      const goToEndButton = await page.$("#scroll-down-btn");
      if (goToEndButton) {
        await page.click("#scroll-down-btn");
        console.log('"Go to end" button clicked.');
      } else {
        console.log('"Go to end" button not found.');
      }

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
