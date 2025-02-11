const https = require("https");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const options = {
      hostname: "www.numerade.com",
      path: "/search/whiletype_database/",
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    };

    const request = https.request(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        try {
          const { books, topics, curriculum } = JSON.parse(data);
          res.json({ books, topics, curriculum });
        } catch (error) {
          console.error("Failed to parse response:", error);
          res.status(500).json({ error: "Failed to parse data" });
        }
      });
    });

    request.on("error", (error) => {
      console.error("Request failed:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    });

    request.end();
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
};
