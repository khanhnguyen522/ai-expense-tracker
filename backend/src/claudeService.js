const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
require("dotenv").config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const readReceipt = async (imagePath) => {
  // resize image before sending to Claude
  const resizedBuffer = await sharp(imagePath)
    .resize(800, 1200, { fit: "inside" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const base64Image = resizedBuffer.toString("base64");

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
