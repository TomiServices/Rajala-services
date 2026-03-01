const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "palvelut@fixnero.fi",
    pass: "TÄHÄN_APP_PASSWORD", // käyttää juuri sitä app passwordia
  },
});

transporter.sendMail(
  {
    from: "palvelut@fixnero.fi",
    to: "oma@esim.fi",
    subject: "SMTP TEST",
    html: "Testiviesti Fixnero SMTP:stä",
  },
  (err, info) => {
    if (err) {
      console.error("Virhe:", err);
    } else {
      console.log("Lähetetty!", info);
    }
    process.exit();
  }
);
