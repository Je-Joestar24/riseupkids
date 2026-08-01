# Store assets — Play Store & App Store

Ready-to-upload listing graphics generated from the creatives in this folder.

## Folder map

| Path | Use |
|------|-----|
| `source/` | Original creatives (`1.png`–`5.png`, `feature.png`) |
| `play-store/feature-graphic-1024x500.png` | **Required** Google Play feature graphic |
| `play-store/hi-res-icon-512x512.png` | Google Play hi-res icon |
| `play-store/app-icon-1024x1024.png` | Convenience copy of app icon |
| `play-store/phone-screenshots/` | Phone screenshots (1920×1080) |
| `play-store/tablet-screenshots/` | Optional 7" tablet (1920×1200) |
| `app-store/app-icon-1024x1024.png` | App Store icon (same 1024 asset) |
| `app-store/iphone-6.7-inch-landscape/` | All iPhone 6.7" landscape (2796×1290) |
| `app-store/iphone-6.7-inch-landscape-apple-safe/` | **Preferred for Apple** (no Kid’s Wall tab) |
| `app-store/ipad-12.9-inch-landscape/` | iPad Pro 12.9" landscape (2732×2048) |
| `app-store/ipad-12.9-inch-landscape-apple-safe/` | Preferred iPad set for Apple |
| `listing-copy.md` | Titles, descriptions, keywords, URLs |

## Google Play Console — upload

1. **App icon** → `play-store/hi-res-icon-512x512.png`
2. **Feature graphic** → `play-store/feature-graphic-1024x500.png`
3. **Phone screenshots** (min 2) → all files in `play-store/phone-screenshots/`
4. Optional tablet → `play-store/tablet-screenshots/`
5. Paste text from `listing-copy.md`
6. Privacy policy → `https://riseup.kids/privacy`

Kids Wall can appear in Play screenshots (feature is available on Android).

## App Store Connect — upload

1. **App icon** is taken from the binary (`icon1024`); `app-store/app-icon-1024x1024.png` matches it
2. **iPhone screenshots** → use **`iphone-6.7-inch-landscape-apple-safe/`** first  
   - `00` feature promo  
   - `01` home / immersion overview  
   - `04` StarCam  
   Upload at least these 3 for 6.7" display
3. If iPad is listed → `app-store/ipad-12.9-inch-landscape/` (`00`/`01`/`04` equivalents: use `01` + `04` + optionally recreate feature for iPad, or upload `01`/`04` plus another learning shot)
4. Paste text from `listing-copy.md` (keep Kids Wall as Android/Web only)
5. Privacy policy → `https://riseup.kids/privacy`

### Why “apple-safe”?

Screenshots `02`, `03`, and `05` show a **Kid’s Wall** tab in the phone UI. On iOS the tab is **Soon / Coming Soon**, so those creatives can look inaccurate to App Review. Prefer the apple-safe set for iOS.

Play Store can still use all five phone screenshots.

## Regenerate after new creatives

Replace `1.png`–`5.png` / `feature.png` in this folder, then from `app/`:

```bash
npm run store-assets
```

## Checklist before submit

- [ ] Privacy policy live with Kids Wall Android/Web-only wording
- [ ] iOS TestFlight build includes Coming Soon Kids Wall
- [ ] Apple screenshots from `iphone-6.7-inch-landscape-apple-safe/`
- [ ] Play feature graphic is exactly 1024×500
- [ ] Listing copy does not promise Kids Wall on iOS
- [ ] Support URL + privacy URL set in both consoles
