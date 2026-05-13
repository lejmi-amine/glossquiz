#!/usr/bin/env node

/**
 * AUTO-UPDATE SCRIPT: Add image URLs to questions.js
 *
 * This script automatically adds Clearbit logo URLs to your questions
 * based on category and brand names found in the questions.
 *
 * Usage:
 * node auto-update-images.js
 */

const fs = require("fs");
const path = require("path");

// Brand-to-domain mapping
const BRAND_DOMAINS = {
  "Fenty Beauty": "fenty.com",
  "MAC Cosmetics": "maccosmetics.com",
  MAC: "maccosmetics.com",
  NARS: "narscosmetics.com",
  "Urban Decay": "urbandecay.com",
  "Charlotte Tilbury": "charlottetilbury.com",
  "Huda Beauty": "hudabeauty.com",
  "Too Faced": "toofaced.com",
  "Rare Beauty": "rarebeauty.com",
  "e.l.f. Cosmetics": "elfcosmetics.com",
  "NYX Professional Makeup": "nyxcosmetics.com",
  NYX: "nyxcosmetics.com",
  Chanel: "chanel.com",
  "Louis Vuitton": "louisvuitton.com",
  Gucci: "gucci.com",
  Prada: "prada.com",
  Dior: "dior.com",
  Versace: "versace.com",
  Hermès: "hermes.com",
  Burberry: "burberry.com",
  Celine: "celine.com",
  Fendi: "fendi.com",
  Balenciaga: "balenciaga.com",
  Valentino: "valentino.com",
  "Saint Laurent": "ysl.com",
  "Bottega Veneta": "bottegaveneta.com",
  Givenchy: "givenchy.com",
  Loewe: "loewe.com",
  Coach: "coach.com",
  Cartier: "cartier.com",
  Apple: "apple.com",
  Google: "google.com",
  Nike: "nike.com",
  Adidas: "adidas.com",
  "Mercedes-Benz": "mercedes-benz.com",
  BMW: "bmw.com",
  Audi: "audi.com",
  Tesla: "tesla.com",
  Porsche: "porsche.com",
  Ferrari: "ferrari.com",
  Lamborghini: "lamborghini.com",
  Volkswagen: "volkswagen.com",
  Ford: "ford.com",
  Spotify: "spotify.com",
  Amazon: "amazon.com",
  Samsung: "samsung.com",
  Intel: "intel.com",
  NVIDIA: "nvidia.com",
  YouTube: "youtube.com",
  OPI: "opi.com",
  Essie: "essie.com",
  "Sally Hansen": "sallyhansen.com",
  "The Ordinary": "theordinary.deciem.com",
  CeraVe: "cerave.com",
  "La Roche-Posay": "laroche-posay.com",
  "Paula's Choice": "paulaschoice.com",
  "Drunk Elephant": "drunkelephant.com",
  Tatcha: "tatcha.com",
};

function getBrandLogoUrl(brand) {
  const domain = BRAND_DOMAINS[brand];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}?size=250`;
}

function findBrandInQuestion(question, options) {
  // Search in options first (usually contains the answer)
  for (const answer of Object.values(options)) {
    for (const brand of Object.keys(BRAND_DOMAINS)) {
      if (answer.includes(brand)) {
        return brand;
      }
    }
  }

  // Search in question text
  const questionText = question.toLowerCase();
  for (const brand of Object.keys(BRAND_DOMAINS)) {
    if (questionText.includes(brand.toLowerCase())) {
      return brand;
    }
  }

  return null;
}

function getImageUrlByCategory(category, brand) {
  // Logo questions should use Clearbit
  if (category === "logos_fashion" || category === "logos_tech") {
    return getBrandLogoUrl(brand);
  }

  // For makeup, skincare, nails, accessories - use Unsplash or brand logo
  if (brand) {
    return getBrandLogoUrl(brand);
  }

  return null;
}

async function updateQuestionsFile() {
  const questionsPath = path.join(__dirname, "server", "questions.js");

  if (!fs.existsSync(questionsPath)) {
    console.error("❌ questions.js not found at:", questionsPath);
    return;
  }

  try {
    // Read the file
    let content = fs.readFileSync(questionsPath, "utf8");

    // Parse questions - extract the array
    const startIndex = content.indexOf("[");
    const endIndex = content.lastIndexOf("]") + 1;

    if (startIndex === -1 || endIndex === 0) {
      console.error("❌ Could not parse questions array");
      return;
    }

    // Use require to get the actual questions object
    delete require.cache[require.resolve(questionsPath)];
    const questions = require(questionsPath);

    let updatedCount = 0;

    // Update each question
    questions.forEach((q, idx) => {
      if (q.image) {
        return; // Skip if already has image
      }

      const brand = findBrandInQuestion(q.question, q.options);
      const imageUrl = getImageUrlByCategory(q.category, brand);

      if (imageUrl) {
        q.image = imageUrl;
        updatedCount++;
        console.log(
          `✅ Q${idx + 1} (${q.category}) - Added image for: ${brand}`,
        );
      } else {
        console.log(`⏭️  Q${idx + 1} (${q.category}) - No brand found`);
      }
    });

    // Write updated questions back
    const updatedContent =
      "const questions = " +
      JSON.stringify(questions, null, 0) +
      ";\n\nmodule.exports = questions;";
    fs.writeFileSync(questionsPath, updatedContent, "utf8");

    console.log(`\n✅ Updated ${updatedCount} questions with image URLs!`);
    console.log(`📁 File saved: ${questionsPath}`);
  } catch (error) {
    console.error("❌ Error updating questions:", error.message);
  }
}

// Run the update
console.log("🎨 Auto-updating questions.js with image URLs...\n");
updateQuestionsFile();
