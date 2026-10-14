# Faza Home PDF download notifications

Every successful PDF save in the warranty generator and legacy invoice downloader reports a download to `/api/pdf-download/`. The server emails **fazahomeae@gmail.com** with a navy-and-gold HTML template and a plain-text version. It includes the downloader's name and email from their current Firebase account, the PDF filename, and the server time in Dubai. **The downloaded PDF is attached to the email**, so the recipient can preview it in Gmail or download a copy. If their Firebase display name is empty, the email says **Name not set on account**; set their name in Firebase Authentication to include it.

## Gmail SMTP setup

1. Sign in to the Gmail account you will send from, normally **fazahomeae@gmail.com**.
2. Turn on **2-Step Verification**, then create an [app password](https://myaccount.google.com/apppasswords) named **Faza Warranty Notifications**. See [Google's app password instructions](https://support.google.com/accounts/answer/185833).
3. Add these server-only variables to your local `.env.local` (or existing `.env`):

   ```dotenv
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=fazahomeae@gmail.com
   SMTP_PASSWORD=your_16_character_app_password_without_spaces
   ```

   Use the app password, not your Gmail or Firebase sign-in password. `SMTP_FROM` is optional and defaults to `SMTP_USER`.

4. Add the same variables to **Vercel > Project > Settings > Environment Variables** for Production and any Preview environment you use, then redeploy. Restart the local development server after changing local settings. Do not prefix these variables with `NEXT_PUBLIC_`.
5. Sign in as a team member and download a PDF. Check the inbox and spam folder for **Faza Home | PDF download notification**, then open or download the PDF attachment. The recipient stays **fazahomeae@gmail.com**, even if you use a different Gmail account to send.

The implementation uses [Nodemailer's SMTP transport](https://nodemailer.com/smtp). Another SMTP provider can be used by replacing the host, port, username and password, and setting `SMTP_FROM` to an allowed sender. Port 465 uses implicit TLS; other ports require STARTTLS.

## Download and failure behavior

Notification requests require an active approved team session and the same website origin. The server ignores browser-supplied identity or recipient fields. The download notification is sent after the PDF save succeeds. For standard browser downloads, this confirms the browser started the download; browsers do not report whether the user kept the file. Canceling the legacy file-picker dialog does not send a notification.

The browser uploads the generated PDF bytes with the notification request. The server checks the file's PDF header/end marker and attaches those bytes directly, without fetching a URL or storing a public copy. Attachments support PDFs up to **3 MiB**; larger files still download locally, but the email notification fails visibly. This keeps the base64-encoded request below [Vercel's function payload limit](https://vercel.com/docs/functions/limitations). Earlier notification emails only contain filenames and cannot be updated with attachments; download a new PDF to receive an attached copy.

If SMTP is unconfigured or sending fails, the downloaded PDF is kept and the user sees an explicit notification failure message. The server logs only the error code. There is no automatic email retry queue; failed notifications must be investigated using the server logs. SMTP acceptance does not guarantee inbox delivery.

## Protected administrator

The enabled Firebase account **fazahomeae@gmail.com** has permanent admin access in this application, including if it has no `fazaRole` claim yet. It appears as **Protected admin** in the team list. App admins cannot delete it, disable it, demote it or remove its access, including through direct API requests. The server compares its actual Firebase email without regard to case.

This protection applies to the application. Project owners or service accounts with Firebase administrative permissions can still modify users directly through Firebase Console or the Admin SDK; those permissions must be managed in Google Cloud IAM.

## Verification

```powershell
node --test tests/admin-setup.test.mjs tests/download-notification.test.mjs
```

The mail tests render real MIME messages locally without sending email. The Firebase emulator suite in `tests/auth.integration.mjs` checks owner protection and download endpoint authorization. Run that suite with **no SMTP credentials on the local app server** to exercise notification configuration failure without sending real messages; see [FIREBASE_AUTH_SETUP.md](FIREBASE_AUTH_SETUP.md) for emulator commands.
