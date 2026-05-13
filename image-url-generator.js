/**
 * HELPER SCRIPT: Auto-generate image URLs for GlossQuiz questions
 *
 * This script maps brand names to their Clearbit logo URLs
 * Copy this into Node.js or a browser console to update questions.js
 *
 * Usage:
 * 1. Update the BRAND_DOMAINS object below with your brands
 * 2. Run this script
 * 3. Copy the output
 * 4. Paste into questions.js
 */

// Brand domain mapping - UPDATE THIS WITH YOUR BRANDS
const BRAND_DOMAINS = {
  // Makeup brands
  "Fenty Beauty": "fenty.com",
  "MAC Cosmetics": "maccosmetics.com",
  NARS: "narscosmetics.com",
  "Urban Decay": "urbandecay.com",
  "Charlotte Tilbury": "charlottetilbury.com",
  "Huda Beauty": "hudabeauty.com",
  "Too Faced": "toofaced.com",
  "Rare Beauty": "rarebeauty.com",
  "e.l.f. Cosmetics": "elfcosmetics.com",
  "NYX Professional Makeup": "nyxcosmetics.com",

  // Fashion brands
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

  // Tech/Car brands
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

  // Other
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

/**
 * Get Clearbit logo URL for a brand
 * @param {string} brandName - The brand name
 * @param {number} size - Logo size in pixels (default: 200)
 * @returns {string} Clearbit logo URL
 */
function getBrandLogoUrl(brandName, size = 200) {
  const domain = BRAND_DOMAINS[brandName];
  if (!domain) {
    console.warn(`⚠️ Domain not found for: ${brandName}`);
    return null;
  }
  return `https://logo.clearbit.com/${domain}?size=${size}`;
}

/**
 * Generate an image URL based on category
 * @param {string} category - Question category
 * @param {string} brandName - Brand or product name
 * @returns {string} Image URL
 */
function getImageUrl(category, brandName) {
  // For logo-based questions, use Clearbit
  if (category === "logos_fashion" || category === "logos_tech") {
    return getBrandLogoUrl(brandName, 300);
  }

  // For other categories, use Unsplash search URLs or Clearbit
  const searchTerms = {
    makeup: `makeup ${brandName}`,
    accessories: `fashion bag shoes jewelry`,
    skincare: `skincare products`,
    nails: `nail polish manicure`,
  };

  const term = searchTerms[category] || category;
  return getBrandLogoUrl(brandName, 200); // Fallback to Clearbit
}

/**
 * Extract brand name from question text
 * Looks for patterns like "...brand...", "Which is...", etc.
 */
function extractBrandFromQuestion(question, options) {
  // Try to find brand in options (usually first option or correct answer)
  for (const answer of Object.values(options)) {
    for (const [brand] of Object.entries(BRAND_DOMAINS)) {
      if (answer.includes(brand)) return brand;
    }
  }
  return null;
}

/**
 * EXAMPLE: Update a single question with image
 */
function updateQuestionWithImage(question) {
  const brand = extractBrandFromQuestion(question.question, question.options);
  if (brand) {
    question.image = getBrandLogoUrl(brand, 250);
    return true;
  }
  return false;
}

// ============= USAGE EXAMPLES =============

console.log("🎨 Clearbit Logo URL Generator\n");

// Example 1: Get logo for a brand
console.log("Example 1: Single brand logo");
console.log(getBrandLogoUrl("Chanel", 250));
console.log("→ https://logo.clearbit.com/chanel.com?size=250\n");

// Example 2: Generate URLs for all brands
console.log("Example 2: All brand URLs");
Object.entries(BRAND_DOMAINS)
  .slice(0, 5)
  .forEach(([brand, domain]) => {
    console.log(`${brand} → https://logo.clearbit.com/${domain}?size=200`);
  });
console.log(`... and ${Object.keys(BRAND_DOMAINS).length - 5} more\n`);

// Export functions for use in Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BRAND_DOMAINS,
    getBrandLogoUrl,
    getImageUrl,
    extractBrandFromQuestion,
    updateQuestionWithImage,
  };
}
