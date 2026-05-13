#!/usr/bin/env node

/**
 * Fix image URLs - Replace Clearbit with working CORS-friendly URLs
 */

const fs = require("fs");
const path = require("path");

// Brand to Unsplash/free image URL mapping
const BRAND_IMAGE_URLS = {
  // Fashion/Luxury
  "chanel.com":
    "https://images.unsplash.com/photo-1566150905458-1bf049841919?w=400",
  "gucci.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "louisvuitton.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "prada.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "dior.com":
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400",
  "versace.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "hermes.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "burberry.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "fendi.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "balenciaga.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "valentino.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "givenchy.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "bottegaveneta.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "celine.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "ysl.com": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "loewe.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "coach.com":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
  "cartier.com":
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",

  // Makeup brands
  "fenty.com":
    "https://images.unsplash.com/photo-1631214174585-fe5582eeb7c1?w=400",
  "maccosmetics.com":
    "https://images.unsplash.com/photo-1596062014151-3bbed34e8b50?w=400",
  "narscosmetics.com":
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
  "urbandecay.com":
    "https://images.unsplash.com/photo-1571877227200-a0fb08a01a18?w=400",
  "charlottetilbury.com":
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
  "hudabeauty.com":
    "https://images.unsplash.com/photo-1609234656388-795ce14d2fda?w=400",
  "toofaced.com":
    "https://images.unsplash.com/photo-1596062014151-3bbed34e8b50?w=400",
  "rarebeauty.com":
    "https://images.unsplash.com/photo-1596062014151-3bbed34e8b50?w=400",
  "elfcosmetics.com":
    "https://images.unsplash.com/photo-1596062014151-3bbed34e8b50?w=400",
  "nyxcosmetics.com":
    "https://images.unsplash.com/photo-1596062014151-3bbed34e8b50?w=400",

  // Tech/Cars
  "apple.com":
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
  "google.com":
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400",
  "nike.com": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  "adidas.com":
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  "mercedes-benz.com":
    "https://images.unsplash.com/photo-1554744512-d2c14b3d7e75?w=400",
  "bmw.com":
    "https://images.unsplash.com/photo-1617654112368-307921291f42?w=400",
  "audi.com":
    "https://images.unsplash.com/photo-1526768752127-a86efdf25122?w=400",
  "tesla.com":
    "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=400",
  "porsche.com":
    "https://images.unsplash.com/photo-1554744512-d2c14b3d7e75?w=400",
  "ferrari.com":
    "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400",
  "lamborghini.com":
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
  "volkswagen.com":
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400",
  "ford.com": "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400",
  "spotify.com":
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
  "amazon.com":
    "https://images.unsplash.com/photo-1516321318423-f06f70d504d0?w=400",
  "samsung.com":
    "https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=400",
  "intel.com":
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
  "nvidia.com":
    "https://images.unsplash.com/photo-1591825481359-8914d5238bfb?w=400",
  "youtube.com":
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",

  // Skincare/Nails
  "cerave.com":
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400",
  "laroche-posay.com":
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400",
  "paulaschoice.com":
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400",
  "drunkelephant.com":
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400",
  "tatcha.com":
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400",
  "theordinary.deciem.com":
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400",
  "opi.com":
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400",
  "essie.com":
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400",
  "sallyhansen.com":
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400",
};

function getImageUrl(domain) {
  return (
    BRAND_IMAGE_URLS[domain] ||
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400"
  );
}

function fixImageUrls() {
  const questionsPath = path.join(__dirname, "server", "questions.js");

  if (!fs.existsSync(questionsPath)) {
    console.error("❌ questions.js not found");
    return;
  }

  try {
    delete require.cache[require.resolve(questionsPath)];
    const questions = require(questionsPath);

    let fixed = 0;

    questions.forEach((q, idx) => {
      if (q.image && q.image.includes("clearbit")) {
        // Extract domain from URL like "https://logo.clearbit.com/chanel.com?size=250"
        const match = q.image.match(/clearbit\.com\/([^?]+)/);
        const domain = match ? match[1] : null;

        if (domain) {
          const newUrl = getImageUrl(domain);
          q.image = newUrl;
          fixed++;
          console.log(`✅ Q${idx + 1} - Fixed image URL for ${domain}`);
        }
      }
    });

    // Write back
    const content =
      "const questions = " +
      JSON.stringify(questions, null, 2) +
      ";\n\nmodule.exports = questions;";
    fs.writeFileSync(questionsPath, content);

    console.log(`\n✅ Fixed ${fixed} image URLs!`);
    console.log(`📁 File updated: ${questionsPath}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fixImageUrls();
