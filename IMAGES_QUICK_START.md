# GlossQuiz Image Update - Quick Start Guide

## What's Changed? ✨

Your app now displays **real product and logo images** instead of just text questions!

## How to Add Images

### Option 1: Auto-Update Script (Fastest ⚡)

Run this command in your project root:

```bash
node auto-update-images.js
```

This will:

- ✅ Scan all questions
- ✅ Find brand names automatically
- ✅ Add Clearbit logo URLs to questions
- ✅ Update questions.js

### Option 2: Manual Update (For Specific Questions)

Edit `server/questions.js` and add the `image` field to each question:

```javascript
{
  'id': 'q026',
  'category': 'logos_fashion',
  'question': 'This interlocking double-C logo belongs to:',
  'image': 'https://logo.clearbit.com/chanel.com?size=250',  // ← ADD THIS
  'options': {
    'A': 'Coach',
    'B': 'Chanel',
    'C': 'Celine',
    'D': 'Cartier'
  },
  'correct': 'B'
}
```

## Image Sources

### Clearbit Logo API (Best for Logos)

```
https://logo.clearbit.com/{domain}?size={size}
```

**Examples:**

- Chanel logo: `https://logo.clearbit.com/chanel.com?size=250`
- Fenty Beauty: `https://logo.clearbit.com/fenty.com?size=250`
- Apple: `https://logo.clearbit.com/apple.com?size=250`
- Nike: `https://logo.clearbit.com/nike.com?size=250`

### For Product Photos (Free)

- **Unsplash**: https://unsplash.com/search/makeup
- **Pexels**: https://www.pexels.com/search/cosmetics
- **Pixabay**: https://pixabay.com

## Test Your Changes

1. **Run server:**

   ```bash
   cd server && npm start
   ```

2. **Open in browser:**

   ```
   http://localhost:3000
   ```

3. **Check images load:**
   - Create a game
   - Images should display instead of text questions
   - If image fails, it falls back to text

## Checklist

- [ ] Run `node auto-update-images.js`
- [ ] Check questions.js for image fields
- [ ] Test in browser
- [ ] Verify images load quickly
- [ ] Test on mobile

## Troubleshooting

**Images not showing?**

- Check browser console for errors (F12)
- Verify image URLs are accessible
- Clear browser cache

**Slow image loading?**

- Use smaller image sizes (250px instead of 500px)
- Consider image optimization
- Use CDN urls

**Need custom images?**

- See `IMAGE_GUIDE.md` for detailed instructions
- Use `image-url-generator.js` for reference

## File Descriptions

| File                     | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `auto-update-images.js`  | 🤖 Automatically adds image URLs to questions |
| `image-url-generator.js` | 🎨 Helper script to generate Clearbit URLs    |
| `IMAGE_GUIDE.md`         | 📖 Detailed guide with all resources          |
| `server/questions.js`    | 📝 Your updated questions with images         |

## Want More Control?

Edit `image-url-generator.js` to:

- Add more brand domains
- Customize image sizes
- Use different image sources
- Add category-specific image URLs

## Next Steps

1. ✅ Run the auto-update script
2. ✅ Test in your browser
3. ✅ Deploy to production
4. ✅ Enjoy visual quiz experience! 🎉

---

**Questions?** Check `IMAGE_GUIDE.md` for detailed instructions!
