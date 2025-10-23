# Testaus- ja Validointiohje - Fixnero SEO

Tämä ohje auttaa sinua testaamaan ja validoimaan kaikki SEO-toteutukset.

## 🚀 Pikatestaus (5-10 minuuttia)

### 1. Google Rich Results Test

Testaa jokainen sivu erikseen:

**Etusivu**:
```
https://search.google.com/test/rich-results?url=https://www.rajala-services.com/
```

**Palvelusivut** (testaa kaikki):
- Autohuolto: `/autohuolto.html`
- Pesupalvelut: `/pesupalvelut.html`
- Rengastyöt: `/rengastyot.html`
- Sisäpuhdistus: `/sisapuhdistus.html`
- Kiilloitus: `/kiilloitus.html`
- Lasikorjaus: `/lasikorjaus.html`

**Odotetut tulokset jokaiselle sivulle**:
- ✅ Vihreä "Valid" -merkintä
- ✅ Ei virheitä (0 errors)
- ⚠️ Varoitukset (warnings) ovat OK

### 2. Schema.org Validator

Kopioi JSON-LD koodi ja validoi:

1. Mene: https://validator.schema.org/
2. Kopioi jokaisen sivun `<script type="application/ld+json">` sisältö
3. Liitä validaattoriin
4. Klikkaa "Validate"

**Testattavat schemat**:

**Etusivu**:
- LocalBusiness & AutoRepair schema
- FAQPage schema
- ItemList schema

**Jokainen palvelusivu**:
- Service schema
- BreadcrumbList schema

### 3. Meta Tags -tarkistus

Avaa jokainen sivu ja tarkista selaimen "View Source" -toiminnolla:

**Tarkistettavat asiat jokaisella sivulla**:
- [ ] `<title>` sisältää "Fixnero" ja palvelun nimen
- [ ] `<meta name="description">` on uniikki
- [ ] `<meta name="keywords">` sisältää tavoitellut hakusanat
- [ ] Open Graph tagit (`og:title`, `og:description`, `og:image`)
- [ ] Twitter Card tagit
- [ ] Canonical URL (`<link rel="canonical">`)

## 📊 Yksityiskohtainen Testaus (30-60 minuuttia)

### Testi 1: Google Rich Results - Etusivu

**Vaiheet**:
1. Mene: https://search.google.com/test/rich-results
2. Syötä URL: `https://www.rajala-services.com/`
3. Klikkaa "Test URL"
4. Odota tuloksia (10-30 sekuntia)

**Odotetut tulokset**:
- ✅ LocalBusiness schema detected
- ✅ FAQPage schema detected
- ✅ ItemList schema detected
- ✅ No errors (0)
- ℹ️ Mahdolliset varoitukset: OK (esim. "recommended field missing")

**Jos virheitä**:
- Tarkista JSON-LD syntaksi
- Varmista että sulkumerkit ovat oikein
- Tarkista että pilkut ovat oikeissa paikoissa

### Testi 2: Google Rich Results - Palvelusivut

Testaa KAIKKI 6 palvelusivua erikseen samalla tavalla kuin etusivu.

**Jokaisen sivun odotetut tulokset**:
- ✅ Service schema detected
- ✅ BreadcrumbList schema detected
- ✅ No errors

**Palvelusivujen URL:t**:
```
https://www.rajala-services.com/autohuolto.html
https://www.rajala-services.com/pesupalvelut.html
https://www.rajala-services.com/rengastyot.html
https://www.rajala-services.com/sisapuhdistus.html
https://www.rajala-services.com/kiilloitus.html
https://www.rajala-services.com/lasikorjaus.html
```

### Testi 3: Schema.org Validator

**Etusivun LocalBusiness schema**:

1. Avaa `index.html`
2. Etsi `<script type="application/ld+json">` joka sisältää `"@type": ["AutoRepair", "LocalBusiness"]`
3. Kopioi koko JSON-sisältö (alkaen `{` ja päättyen `}`)
4. Mene: https://validator.schema.org/
5. Liitä JSON
6. Klikkaa "Validate"

**Odotetut tulokset**:
- ✅ "Thing > Organization > LocalBusiness > AutomotiveBusiness > AutoRepair"
- ✅ Kaikki pakolliset kentät täytetty
- ℹ️ Mahdolliset suositukset vihreällä: OK

**Toista sama kaikille schemalleille**:
- FAQPage schema (etusivu)
- ItemList schema (etusivu)
- Service schema (jokainen palvelusivu)
- BreadcrumbList schema (jokainen palvelusivu)

### Testi 4: Lighthouse SEO Audit

**Chrome DevTools**:

1. Avaa sivu Chromessa
2. Paina F12 (tai oikea klikkaus -> Inspect)
3. Valitse "Lighthouse" välilehti
4. Valitse vain "SEO" kategoria
5. Klikkaa "Generate report"
6. Odota tuloksia (30-60 sekuntia)

**Tavoite**: SEO score ≥ 90/100

**Jos pistemäärä alle 90**:
- Tarkista puuttuvat meta-tagit
- Varmista että kuvilla on alt-tekstit
- Tarkista canonical URL
- Tarkista robots.txt

**Toista kaikille sivuille** (vähintään etusivu ja 2-3 palvelusivua)

### Testi 5: Mobile-Friendly Test

**Google Mobile-Friendly Test**:

1. Mene: https://search.google.com/test/mobile-friendly
2. Syötä URL
3. Klikkaa "Test URL"
4. Odota tuloksia

**Odotetut tulokset**:
- ✅ "Page is mobile friendly"
- ✅ Vihreä status

**Toista ainakin etusivulle ja 1-2 palvelusivulle**

### Testi 6: Open Graph Debugger

**Facebook Debugger**:

1. Mene: https://developers.facebook.com/tools/debug/
2. Syötä URL
3. Klikkaa "Debug"
4. Tarkista esikatselu

**Odotetut tulokset**:
- ✅ Otsikko näkyy oikein
- ✅ Kuvaus näkyy oikein
- ✅ Kuva latautuu oikein
- ✅ URL on oikein

**Testaa ainakin**:
- Etusivu
- 2-3 palvelusivua

## 🔍 Ongelmanratkaisu

### Ongelma: "Service schema not detected"

**Ratkaisu**:
1. Tarkista että `<script type="application/ld+json">` on oikein
2. Varmista että JSON-syntaksi on kunnossa (ei puuttuvia pilkkuja)
3. Tarkista että `@context` ja `@type` ovat oikein
4. Validoi JSON: https://jsonlint.com/

### Ongelma: "Breadcrumb schema not detected"

**Ratkaisu**:
1. Tarkista että BreadcrumbList-schema on lisätty
2. Varmista että `itemListElement` on array
3. Tarkista että `position` alkaa 1:stä
4. Varmista että `item` URL:t ovat oikein

### Ongelma: "Missing required field"

**Ratkaisu**:
1. Tarkista virheilmoitus - mikä kenttä puuttuu?
2. Lisää puuttuva kenttä schemaan
3. Varmista että kentän arvo on oikean tyyppinen (string, number, jne.)

### Ongelma: Lighthouse SEO score alle 90

**Yleisimmät syyt**:
- Puuttuva meta description
- Puuttuva canonical URL
- Kuvilla ei ole alt-tekstiä
- Robots.txt estää indeksoinnin
- Puuttuva viewport meta tag

**Ratkaisu**:
1. Lue Lighthouse raportti huolellisesti
2. Korjaa ilmoitetut ongelmat
3. Testaa uudelleen

## ✅ Validointilista

Käytä tätä tarkistuslistaa:

### Etusivu (index.html)
- [ ] Google Rich Results: LocalBusiness schema valid
- [ ] Google Rich Results: FAQPage schema valid
- [ ] Google Rich Results: ItemList schema valid
- [ ] Schema.org: Kaikki schemat validoitu
- [ ] Lighthouse SEO: ≥ 90/100
- [ ] Mobile-Friendly: Pass
- [ ] Open Graph: Preview OK
- [ ] Meta title sisältää "Fixnero"
- [ ] Meta description uniikki ja houkutteleva

### Jokainen palvelusivu (6 kpl)
- [ ] Google Rich Results: Service schema valid
- [ ] Google Rich Results: BreadcrumbList schema valid
- [ ] Schema.org: Molemmat schemat validoitu
- [ ] Lighthouse SEO: ≥ 90/100
- [ ] Meta title sisältää palvelun + "Espoo"
- [ ] Meta description mainitaa "Fixnero"
- [ ] Canonical URL oikein

## 📝 Raportoi Tulokset

Kun testit on tehty, dokumentoi tulokset:

**Onnistuneet sivut**:
- [ ] index.html - ✅ Kaikki OK
- [ ] autohuolto.html - ✅ Kaikki OK
- [ ] pesupalvelut.html - ✅ Kaikki OK
- [ ] rengastyot.html - ✅ Kaikki OK
- [ ] sisapuhdistus.html - ✅ Kaikki OK
- [ ] kiilloitus.html - ✅ Kaikki OK
- [ ] lasikorjaus.html - ✅ Kaikki OK

**Ongelmat** (jos löytyy):
- Sivu: _______________
- Ongelma: _______________
- Ratkaisu: _______________

## 🚀 Julkaisu

Kun kaikki testit ovat onnistuneet:

1. ✅ Lähetä sivut tuotantoon
2. ✅ Lähetä sitemap Google Search Consoleen
3. ✅ Pyydä indeksointi päivitetyille sivuille
4. 📊 Aloita seuranta (Search Console, Analytics)

## ❓ Apua Tarvittaessa

**Lisätietoja**:
- SEO_SCHEMA_VALIDATION_REPORT.md (yksityiskohtainen raportti)
- SEO_TOTEUTUS_YHTEENVETO.md (toteutuksen yhteenveto)
- SEO_IMPLEMENTATION_GUIDE.md (alkuperäinen ohje)

**Hyödylliset linkit**:
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
- Google Search Console: https://search.google.com/search-console
- Lighthouse: Chrome DevTools -> Lighthouse
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly

---

**Onnea testaamiseen!** 🎉

Jos kaikki testit menevät läpi, SEO-optimointi on onnistunut ja sivusto on valmis parempaan hakukonenäkyvyyteen.
