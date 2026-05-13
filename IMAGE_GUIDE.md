# Adding Real Product & Logo Images to GlossQuiz

## Overview

Your app is **already configured** to display images! You just need to add image URLs to each question.

## How It Works

Each question now has an optional `image` field:

```javascript
{
  'id': 'q001',
  'category': 'makeup',
  'question': 'Which brand is famous for...',
  'image': 'https://example.com/image.jpg',  // ← ADD THIS
  'options': {...},
  'correct': 'A'
}
```

The client will:

1. ✅ Display the image if provided
2. ✅ Fall back to text if image fails
3. ✅ Hide text questions and show only images

## Best Free Image Sources

### For Product Photos

- **Unsplash** - https://unsplash.com (Free, high quality)
  - Search: "fenty beauty foundation", "mac lipstick", "nail polish"
  - Copy direct image URLs like: `https://images.unsplash.com/photo-1631214174585-fe5582eeb7c1?w=600`

- **Pexels** - https://www.pexels.com (Free)
  - Great for beauty products, cosmetics

- **Pixabay** - https://pixabay.com (Free)
  - Good for logos and brand images

### For Brand Logos

- **Clearbit Logo API** - FREE and PERFECT for logos

  ```
  https://logo.clearbit.com/{domain}?size=200
  ```

  Examples:

  ```
  https://logo.clearbit.com/fenty.com?size=200  → Fenty Beauty logo
  https://logo.clearbit.com/nars.com?size=200   → NARS logo
  https://logo.clearbit.com/chanel.com?size=200 → Chanel logo
  ```

- **Wikimedia Commons** - https://commons.wikimedia.org (Free logos)

- **Brand Official Sites** - Use direct brand imagery (check their terms)

## Quick Examples for Your Categories

### Makeup Category

```javascript
{
  'id': 'q001',
  'question': "Which brand is famous for the Pro Filt'r Foundation?",
  'image': 'https://logo.clearbit.com/fenty.com?size=200',
  'options': {...},
  'correct': 'A'
}
```

### Fashion Logos

```javascript
{
  'id': 'q026',
  'question': 'This interlocking double-C logo belongs to:',
  'image': 'https://logo.clearbit.com/chanel.com?size=200',
  'options': {...},
  'correct': 'B'
}
```

### Tech Logos

```javascript
{
  'id': 'q126',
  'question': 'The bitten apple logo belongs to:',
  'image': 'https://logo.clearbit.com/apple.com?size=200',
  'options': {...},
  'correct': 'B'
}
```

## Updating questions.js

### Method 1: Manual (For Specific Questions)

Edit each question and add the `image` field:

```javascript
{
  'id': 'q001',
  'category': 'makeup',
  'difficulty': 'easy',
  'question': 'Which brand is famous for the Pro Filt\'r Soft Matte Longwear Foundation?',
  'image': 'https://logo.clearbit.com/fenty.com?size=200',  // ← ADD THIS LINE
  'options': {'A': 'Fenty Beauty', 'B': 'MAC Cosmetics', 'C': 'Rare Beauty', 'D': 'NYX Professional Makeup'},
  'correct': 'A'
}
```

### Method 2: Auto-Generate for Logo Questions (Recommended)

Create a mapping of domain names for your questions. I can help create a script that automatically generates Clearbit URLs based on the brand names.

## Useful Brand Domains for Clearbit

**Makeup Brands:**

- Fenty → fenty.com
- MAC → maccosmetics.com
- NARS → narscosmetics.com
- Urban Decay → urbandecay.com
- Charlotte Tilbury → charlottetilbury.com
- Huda Beauty → hudabeauty.com
- Too Faced → toofaced.com

**Fashion Brands:**

- Chanel → chanel.com
- Louis Vuitton → louisvuitton.com
- Gucci → gucci.com
- Prada → prada.com
- Dior → dior.com
- Versace → versace.com
- Hermès → hermes.com

**Tech Brands:**

- Apple → apple.com
- Google → google.com
- Nike → nike.com
- Adidas → adidas.com
- Mercedes → mercedes-benz.com
- BMW → bmw.com
- Tesla → tesla.com

## URL Image Size Tips

Keep consistent sizing for better UX:

- Logos: `?size=200` or `?size=300`
- Products: Use `?w=600` or `?w=400` for Unsplash/Pexels
- Recommended display size: 400-600px wide

## Testing Your Images

1. Open DevTools (F12)
2. Check the Network tab for image loading
3. Verify images load quickly (< 1 second)
4. Test on mobile to ensure responsive

## Complete Implementation Checklist

- [ ] Add `image` field to makeup questions (25 total)
- [ ] Add `image` field to fashion logo questions (25 total)
- [ ] Add `image` field to accessories questions (25 total)
- [ ] Add `image` field to skincare questions (25 total)
- [ ] Add `image` field to nails questions (25 total)
- [ ] Add `image` field to tech logo questions (25 total)
- [ ] Add `image` field to wildcard questions (25 total)
- [ ] Test in browser to verify images load
- [ ] Check mobile responsiveness

## Need Help?

I can create a script to auto-generate Clearbit URLs for all your logo-based questions. Just let me know!
