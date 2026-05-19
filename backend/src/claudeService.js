const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const heicConvert = require("heic-convert");
require("dotenv").config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const readReceipt = async (imagePath) => {
  let imageData = fs.readFileSync(imagePath);

  // Check if HEIC by magic bytes
  const header = imageData.slice(4, 12).toString("ascii");
  if (header.includes("ftyp")) {
    // Convert HEIC to JPEG
    const jpegBuffer = await heicConvert({
      buffer: imageData,
      format: "JPEG",
      quality: 0.8,
    });
    imageData = Buffer.from(jpegBuffer);
  }

  const base64Image = imageData.toString("base64");
  try {
    fs.unlinkSync(imagePath);
  } catch (e) {}

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `Analyze this receipt and respond ONLY with JSON, no markdown:
            {
              "store_name": "store name here",
              "amount": 0.00,
              "category": "groceries",
              "date": "YYYY-MM-DD"
            }`,
          },
        ],
      },
    ],
  });

  const responseText = message.content[0].text;
  const cleaned = responseText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
};

module.exports = { readReceipt };
