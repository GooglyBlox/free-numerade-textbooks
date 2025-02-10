const chromium = require("@sparticuz/chromium");
let puppeteer;

if (process.env.VERCEL) {
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

async function performLogin(page) {
  try {
    await page.goto("https://www.numerade.com/login/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("#signUpForm", { timeout: 30000 });
    await page.waitForSelector('[name="csrfmiddlewaretoken"]', {
      timeout: 30000,
    });

    const csrfToken = await page.$eval(
      '[name="csrfmiddlewaretoken"]',
      (el) => el.value
    );

    await page.evaluate(
      ({ email, password, csrf }) => {
        const form = document.getElementById("signUpForm");
        const emailInput = form.querySelector('[data-test-id="user-email"]');
        const passwordInput = form.querySelector(
          '[data-test-id="user-password"]'
        );
        const csrfInput = form.querySelector('[name="csrfmiddlewaretoken"]');

        emailInput.value = email;
        passwordInput.value = password;
        csrfInput.value = csrf;

        form.submit();
      },
      {
        email: process.env.NUMERADE_EMAIL,
        password: process.env.NUMERADE_PASSWORD,
        csrf: csrfToken,
      }
    );

    await page.waitForNavigation({
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    return !page.url().includes("/login");
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
}

async function addBookToLibrary(page, bookId) {
  try {
    const cookies = await page.cookies();
    const csrfToken = cookies.find(
      (cookie) => cookie.name === "csrftoken"
    )?.value;
    const sessionId = cookies.find(
      (cookie) => cookie.name === "sessionid"
    )?.value;

    if (!csrfToken || !sessionId) {
      throw new Error("Required cookies not found");
    }

    const response = await page.evaluate(
      async ({ csrfToken, sessionId, bookId }) => {
        const res = await fetch("https://www.numerade.com/api/v1/user/books", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
            Cookie: `sessionid=${sessionId}`,
          },
          credentials: "include",
          body: JSON.stringify({
            bookIds: [bookId],
          }),
        });
        return res.ok;
      },
      { csrfToken, sessionId, bookId }
    );

    return response;
  } catch (error) {
    console.error("Failed to add book:", error);
    return false;
  }
}

async function getBookPdfUrl(page, bookId) {
  try {
    const response = await page.evaluate(async (bookId) => {
      const res = await fetch(
        "https://www.numerade.com/api/v1/user/books?format=json"
      );
      const data = await res.json();
      const matchingBook = data.results.find(
        (result) => result.book.id === bookId
      );
      return matchingBook?.book?.pdfUrl || null;
    }, bookId);

    return response;
  } catch (error) {
    console.error("Failed to get PDF URL:", error);
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { bookId } = req.method === "POST" ? req.body : req.query;

  if (!bookId) {
    return res.status(400).json({ error: "Book ID is required" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--disable-web-security",
      ],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (
        ["image", "font", "stylesheet"].includes(request.resourceType()) ||
        request
          .url()
          .match(
            /google-analytics|doubleclick|facebook|analytics|tracker|pixel/
          )
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    const loginSuccess = await performLogin(page);
    if (!loginSuccess) {
      throw new Error("Authentication failed");
    }

    const addBookSuccess = await addBookToLibrary(page, bookId);
    if (!addBookSuccess) {
      throw new Error("Failed to add book to library");
    }

    const pdfUrl = await getBookPdfUrl(page, bookId);
    if (!pdfUrl) {
      throw new Error("Failed to retrieve PDF URL");
    }

    await browser.close();

    res.json({
      success: true,
      pdfUrl,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message });
  }
};
