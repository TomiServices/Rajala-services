# Hero-kuvien käyttöohje / Hero Images Guide

## Responsiiviset Hero-kuvat

Verkkosivusto käyttää kolmea eri hero-kuvaa eri näyttöresoluutioille optimaalisen käyttökokemuksen varmistamiseksi.

### Kuvien tekniset vaatimukset

#### Hero1 - 2K ja suuremmat näytöt (yli 2560px leveys)
- **Tiedostonimi**: `hero1-2k.jpg`
- **Suositeltu resoluutio**: 3840 x 2160 px (4K) tai 2560 x 1440 px (2K)
- **Käyttötarkoitus**: Suuret näytöt, 2K ja 4K monitorit
- **Tiedostokoko**: Maksimi 3-4 MB (optimoitu laatu)
- **Formaatti**: JPG (parempi tiedostokoko) tai PNG (läpinäkyvyys)

#### Hero2 - Työpöytä ja kannettavat (768px - 2559px leveys)
- **Tiedostonimi**: `hero2-desktop.jpg`
- **Suositeltu resoluutio**: 1920 x 1080 px (Full HD)
- **Käyttötarkoitus**: Tavalliset työpöytänäytöt ja kannettavat tietokoneet
- **Tiedostokoko**: Maksimi 2-3 MB (optimoitu laatu)
- **Formaatti**: JPG (parempi tiedostokoko) tai PNG (läpinäkyvyys)

#### Hero3 - Mobiililaitteet (alle 768px leveys)
- **Tiedostonimi**: `hero3-mobile.jpg`
- **Suositeltu resoluutio**: 1080 x 1920 px (pystysuunta) tai 1280 x 720 px (vaakasuunta)
- **Käyttötarkoitus**: Älypuhelimet ja pienet tabletit
- **Tiedostokoko**: Maksimi 500 KB - 1 MB (optimoitu mobiilille)
- **Formaatti**: JPG (pienempi tiedostokoko mobiilille)

### Kuvien laatu ja optimointi

1. **Korkea laatu**: Käytä korkeatasoisia, ammattimaisia kuvia
2. **Kirkkautta ja kontrastia**: Varmista, että teksti näkyy hyvin kuvan päällä
3. **Kuvan fokus**: Aseta tärkeät elementit kuvan keskelle
4. **Värimaailma**: Käytä sivuston värimaailmaan sopivia kuvia
5. **Tiedostokoon optimointi**:
   - Käytä kuvanpakkaustyökaluja (TinyPNG, ImageOptim, Squoosh)
   - Säilytä hyvä laatu, mutta pidä tiedostokoko kohtuullisena
   - JPG: 80-90% laatu on yleensä riittävä

### Kuvien vaihtaminen

Korvaa nykyiset hero-kuvat uusilla kuvilla:

1. **Lataa uudet kuvat** projektin juurihakemistoon
2. **Nimeä tiedostot oikein**:
   - `hero1-2k.jpg` (2K ja suuremmat näytöt)
   - `hero2-desktop.jpg` (työpöydät)
   - `hero3-mobile.jpg` (mobiililaitteet)
3. **Testaa kuvat** eri laitteilla ja resoluutioilla

### Tekniset yksityiskohdat

#### CSS-toteutus
Kuvat ladataan automaattisesti käyttäjän näyttöresoluution perusteella CSS media queries -teknologiaa käyttäen:

```css
/* Hero1: 2K+ näytöt */
@media (min-width: 2560px) {
    #hero {
        background-image: url('hero1-2k.jpg');
    }
}

/* Hero2: Työpöydät (768px - 2559px) */
@media (min-width: 768px) and (max-width: 2559px) {
    #hero {
        background-image: url('hero2-desktop.jpg');
    }
}

/* Hero3: Mobiililaitteet (< 768px) */
@media (max-width: 767px) {
    #hero {
        background-image: url('hero3-mobile.jpg');
    }
}
```

#### Suorituskyvyn optimointi
- Kuvat ladataan `preload` -attribuutilla nopeampaa latausaikaa varten
- Media queries varmistavat, että vain tarvittava kuva ladataan
- `background-size: cover` varmistaa, että kuva täyttää koko hero-alueen
- `background-position: center` keskittää kuvan

### Suositellut kuvatyypit

1. **Autoja huollettavana** - Näyttää palvelun laatua
2. **Yksityiskohtaisia lähikuvia** - Kiillotus, pesu, yksityiskohdat
3. **Ammattilaiset töissä** - Luotettavuus ja ammattitaito
4. **Ennen/jälkeen -kuvia** - Palvelun tulokset
5. **Modernit tilat** - Laadukas työympäristö

### Tuki ja apua

Jos tarvitset apua kuvien vaihtamisessa tai optimoinnissa, ota yhteyttä kehittäjään.

---

## English Version

### Responsive Hero Images

The website uses three different hero images for different screen resolutions to ensure optimal user experience.

### Technical Requirements

#### Hero1 - 2K and Larger Displays (> 2560px width)
- **Filename**: `hero1-2k.jpg`
- **Recommended Resolution**: 3840 x 2160 px (4K) or 2560 x 1440 px (2K)
- **Purpose**: Large displays, 2K and 4K monitors
- **File Size**: Maximum 3-4 MB (optimized quality)
- **Format**: JPG (better file size) or PNG (transparency)

#### Hero2 - Desktop and Laptops (768px - 2559px width)
- **Filename**: `hero2-desktop.jpg`
- **Recommended Resolution**: 1920 x 1080 px (Full HD)
- **Purpose**: Standard desktop displays and laptops
- **File Size**: Maximum 2-3 MB (optimized quality)
- **Format**: JPG (better file size) or PNG (transparency)

#### Hero3 - Mobile Devices (< 768px width)
- **Filename**: `hero3-mobile.jpg`
- **Recommended Resolution**: 1080 x 1920 px (portrait) or 1280 x 720 px (landscape)
- **Purpose**: Smartphones and small tablets
- **File Size**: Maximum 500 KB - 1 MB (optimized for mobile)
- **Format**: JPG (smaller file size for mobile)

### Image Quality and Optimization

1. **High Quality**: Use high-quality, professional images
2. **Brightness and Contrast**: Ensure text is visible over the image
3. **Image Focus**: Place important elements in the center
4. **Color Scheme**: Use images that match the website's color scheme
5. **File Size Optimization**:
   - Use image compression tools (TinyPNG, ImageOptim, Squoosh)
   - Maintain good quality while keeping file size reasonable
   - JPG: 80-90% quality is usually sufficient

### How to Replace Images

Replace current hero images with new ones:

1. **Upload new images** to the project root directory
2. **Name files correctly**:
   - `hero1-2k.jpg` (2K and larger displays)
   - `hero2-desktop.jpg` (desktops)
   - `hero3-mobile.jpg` (mobile devices)
3. **Test images** on different devices and resolutions

### Technical Details

The images are loaded automatically based on user screen resolution using CSS media queries technology.

### Performance Optimization
- Images are preloaded with `preload` attribute for faster loading
- Media queries ensure only the necessary image is loaded
- `background-size: cover` ensures the image fills the entire hero area
- `background-position: center` centers the image
