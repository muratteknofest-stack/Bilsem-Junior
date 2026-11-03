# Bundled application fonts

Original, unmodified variable TrueType fonts from google/fonts, licensed under the SIL Open Font License 1.1. The corresponding upstream license files are included alongside the fonts.

- Outfit: `ofl/outfit/Outfit[wght].ttf`, Git blob `466d6245f9582df39bf73da91a8b3c938fd061cd`, weights 100–900.
- Plus Jakarta Sans: `ofl/plusjakartasans/PlusJakartaSans[wght].ttf`, Git blob `0cb13a998ed525ba226d911b10d6c4c4f923a961`, weights 200–800.

Downloaded 28 October 2026. Blob identities and Turkish glyph coverage were verified before bundling. The application serves these resources from its own origin; it does not contact Google Fonts when opening a page.


## Rounded interface typography — 4 November 2026

- Nunito: source `ofl/nunito/Nunito[wght].ttf`, Git blob `2ec1f4b0676c83ef33049db87b311171699e9192`, weights 200–1000; license `nunito-OFL.txt`. Repackaged as WOFF2 with original name, copyright/license metadata, glyphs, metrics, variable axes and character maps preserved.
- Comfortaa: original **unmodified TrueType** `ofl/comfortaa/Comfortaa[wght].ttf`, Git blob `8b8e5f81bf740a8154bb6cd9f4eee5ac4bda6b18`, weights 300–700; license `comfortaa-OFL.txt`. The original TTF is bundled byte for byte, including its Reserved Font Name notice.
- Official source: https://github.com/google/fonts/tree/main/ofl . Git blob identities and the complete Turkish `ÇĞİÖŞÜçğıöşüı` range, digits and arithmetic `×÷−` were verified. The arrow glyph may use the local fallback font.
- Combined file size: 309568 bytes. SHA-256: Nunito `d38f65e00e6faca60e556b26bdda59b4d60c189af2ee0d5a962ba4185f059f45`; Comfortaa `0fc3f45dc48b614db9c39181502544b37217ecbf8bee2fb35886992bc96c5bd3`.
- Shared definitions live in `junior-type.css`. Web, static package pages and Android serve the font files locally; no runtime request is made to Google Fonts.
