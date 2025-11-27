# Firebase Secret Manager - Käyttöohjeet

Tämä dokumentti sisältää ohjeet salasanojen ja arkaluontoisten ympäristömuuttujien hallintaan Firebase Secret Managerin avulla.

## 📋 Miksi Secret Manager?

Cloud Run ja Firebase Functions Gen2 eivät hyväksy käyttöönottoa, jos sama ympäristömuuttuja (esim. `RECAPTCHA_SECRET`) on määritelty sekä:
- tavallisena ympäristömuuttujana `.env`-tiedostossa
- Secret Manager -sidoksena

**Ratkaisu:** Arkaluontoiset tiedot, kuten `RECAPTCHA_SECRET`, tulee aina määritellä Secret Managerin kautta.

## 🔐 RECAPTCHA_SECRET asettaminen

### Vaihe 1: Hanki reCAPTCHA-avain

1. Siirry osoitteeseen: https://www.google.com/recaptcha/admin
2. Luo uusi sivusto tai valitse olemassa oleva
3. Valitse reCAPTCHA v3
4. Kopioi **Secret Key** (salasana-avain)

### Vaihe 2: Aseta salasana Secret Manageriin

Käytä Firebase CLI:tä salasanan asettamiseen:

```bash
# Kirjaudu sisään (jos et ole jo kirjautunut)
firebase login

# Aseta RECAPTCHA_SECRET
firebase functions:secrets:set RECAPTCHA_SECRET
```

Komentorivi pyytää syöttämään arvon. Liitä reCAPTCHA secret key ja paina Enter.

### Vaihe 3: Varmista toimivuus

Tarkista, että salasana on asetettu oikein:

```bash
# Listaa kaikki salasanat
firebase functions:secrets:access RECAPTCHA_SECRET
```

### Vaihe 4: Ota käyttöön

Kun salasana on asetettu, funktiot käyttävät sitä automaattisesti:

```bash
# Julkaise funktiot
firebase deploy --only functions
```

## 📝 Muut salasanat

Seuraavat ympäristömuuttujat voidaan myös siirtää Secret Manageriin turvallisuuden parantamiseksi:

| Muuttuja | Kuvaus | Suositus |
|----------|--------|----------|
| `RECAPTCHA_SECRET` | reCAPTCHA v3 salasana-avain | **Pakollinen** Secret Managerissa |
| `EMAIL_PASSWORD` | Gmail App Password | Suositeltu Secret Managerissa |
| `GOOGLE_SERVICE_ACCOUNT` | Palvelutilin JSON | Voidaan pitää `.env`-tiedostossa |

### EMAIL_PASSWORD asettaminen

```bash
firebase functions:secrets:set EMAIL_PASSWORD
```

## 🔄 Salasanan päivittäminen

Salasanan päivittäminen tapahtuu samalla komennolla:

```bash
firebase functions:secrets:set RECAPTCHA_SECRET
```

Uusi arvo korvaa vanhan. Muista julkaista funktiot uudelleen:

```bash
firebase deploy --only functions
```

## ❌ Salasanan poistaminen

```bash
firebase functions:secrets:destroy RECAPTCHA_SECRET
```

**Huom!** Varmista, että funktiot eivät enää tarvitse poistettavaa salasanaa.

## 🛠️ Vianetsintä

### Virhe: "Secret already bound as environment variable"

Tämä virhe ilmenee, kun sama muuttuja on määritelty sekä `.env`-tiedostossa että Secret Managerissa.

**Ratkaisu:**
1. Poista muuttuja `.env`-tiedostosta
2. Varmista, että muuttuja on vain Secret Managerissa
3. Julkaise uudelleen: `firebase deploy --only functions`

### Virhe: "Permission denied"

**Ratkaisu:**
1. Varmista kirjautuminen: `firebase login`
2. Tarkista projektin valinta: `firebase use --add`
3. Varmista käyttöoikeudet Firebase-konsolissa

### Salasana ei päivity käyttöönoton jälkeen

**Ratkaisu:**
1. Odota 1-2 minuuttia
2. Tarkista salasanan arvo: `firebase functions:secrets:access RECAPTCHA_SECRET`
3. Tee uusi käyttöönotto: `firebase deploy --only functions --force`

## 📚 Lisätietoja

- [Firebase Secret Manager -dokumentaatio](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)

---

**Päivitetty:** Marraskuu 2024  
**Firebase Functions:** Gen2
