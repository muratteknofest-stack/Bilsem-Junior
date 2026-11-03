# Bundled application fonts

Original, unmodified variable TrueType fonts from google/fonts, licensed under the SIL Open Font License 1.1. The corresponding upstream license files are included alongside the fonts.

- Outfit: `ofl/outfit/Outfit[wght].ttf`, Git blob `466d6245f9582df39bf73da91a8b3c938fd061cd`, weights 100–900.
- Plus Jakarta Sans: `ofl/plusjakartasans/PlusJakartaSans[wght].ttf`, Git blob `0cb13a998ed525ba226d911b10d6c4c4f923a961`, weights 200–800.

Downloaded 28 October 2026. Blob identities and Turkish glyph coverage were verified before bundling. The application serves these resources from its own origin; it does not contact Google Fonts when opening a page.


## Rounded interface typography — 4 November 2026

- Nunito: original `ofl/nunito/Nunito[wght].ttf`, Git blob `2ec1f4b0676c83ef33049db87b311171699e9192`, weights 200–1000; license `nunito-OFL.txt`.
- Comfortaa: original `ofl/comfortaa/Comfortaa[wght].ttf`, Git blob `8b8e5f81bf740a8154bb6cd9f4eee5ac4bda6b18`, weights 300–700; license `comfortaa-OFL.txt`.
- Official source: https://github.com/google/fonts/tree/main/ofl . Original Git blob identities were verified before conversion. FontTools converted the containers to WOFF2; outlines, names, variable axes and character maps were preserved. Combined WOFF2 size: 181,024 bytes.
- Turkish `ÇĞİÖŞÜçğıöşüı`, digits and arithmetic `×÷−` were checked in both resulting font character maps. The arrow glyph may use the local fallback font.
- WOFF2 SHA-256: Nunito `8ded0170b8c8004a67be330aa266f4eec09e5bac1f6a26d8fbf2cee51bf5dc35`; Comfortaa `911e79c8667e4cdf4f1da0e96083d48c25f64b3e4beecdef4b2b210983a23487`.
- Shared definitions live in `junior-type.css`. Web, static package pages and Android serve these files locally. No runtime request is made to Google Fonts.
