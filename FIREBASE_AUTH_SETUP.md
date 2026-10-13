# Faza Home team authentication

The generator now requires an approved Firebase account. `admin` accounts manage the team; `member` accounts use the generator. Roles live in the `fazaRole` custom claim and can only be changed by the Admin SDK. There is no public registration page. An account created outside this app has no access until an admin assigns a role.

## 1. Enable Email/Password

1. Open [Firebase Console](https://console.firebase.google.com/) and select **faza-warranty**.
2. Open **Authentication** in the sidebar and click **Get started** if shown.
3. Open **Sign-in method** (or **Sign-in providers**).
4. Select **Email/Password** and turn on **Email/Password**. Email link sign-in is not required.
5. Click **Save**.

See [Firebase's password authentication instructions](https://firebase.google.com/docs/auth/web/password-auth).

You sign in with an account's email and password from **Authentication → Users**. The service-account email and private key below are server credentials; they are not login credentials. There is no default account or password.

## 2. Configure the server

Keep your existing `NEXT_PUBLIC_FIREBASE_*` settings. This implementation also needs credentials to verify sessions and manage users on the server:

1. Open **Project settings → Service accounts → Firebase Admin SDK**.
2. Click **Generate new private key** and download the JSON file to a private location outside this repository.
3. Copy the following three values into **`.env.local`**:

```dotenv
FIREBASE_ADMIN_PROJECT_ID=faza-warranty
FIREBASE_ADMIN_CLIENT_EMAIL=the-client_email-from-your-json
FIREBASE_ADMIN_PRIVATE_KEY="the-private_key-from-your-json"
```

Copy `private_key` exactly, including its `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines. The escaped `\n` line breaks in the JSON value are supported. Do not commit the credential file or `.env.local`, and do not prefix these server credentials with `NEXT_PUBLIC_`.

The example text above must be replaced with actual values from the downloaded JSON. The login page checks the service-account email and private-key format. On localhost in development, expand **Local development: finish Firebase setup** to see which settings need correcting. Production visitors receive a general setup message, without credential diagnostics. Password reset remains available while server setup is incomplete.

Alternatively, local development can use `GOOGLE_APPLICATION_CREDENTIALS` pointing to the downloaded JSON file. Use the three environment variables above on Vercel.

Add the same three server variables and your existing public Firebase variables to **Vercel → Project → Settings → Environment Variables** for the environments you use. Redeploy after saving them. Restart `npm run dev` after changing local variables.

Authentication runs in Next.js API routes on Vercel; Firebase Cloud Functions and a Firestore database are not required for this login system.

## 3. Create your first admin

1. In **Firebase → Authentication → Users**, click **Add user**.
2. Enter your own email address and a strong password.
3. Copy that user's **UID** from the Users list.
4. From this project's terminal, run:

```powershell
npm run auth:make-admin -- YOUR_FIREBASE_USER_UID
```

5. Open `/login/` and sign in. The header will show **Manage team**.

Adding a user in Firebase Console alone does not assign team access; the command above assigns the first admin role. Running it again can restore admin access for an existing enabled account.

## 4. Add your team

1. Sign in as admin and open **Manage team**.
2. Enter the person's name, email, and **Team member** or **Admin** role.
3. Click **Add member**.
4. Copy the password setup link and share it privately with that person. The app does not automatically send invitation emails.
5. They open the link, choose their password, and sign in at `/login/`.

If a setup link cannot be generated, the person can use **Forgot password**. Firebase sends that reset email. Customize those emails under **Authentication → Templates**.

The admin page also lists accounts created in Firebase Console; these initially appear as **Not approved**. Assign a role to approve them. Changing a role, disabling, or deleting an account takes effect on subsequent server requests. Admins cannot change or delete their own account from this page.

Under **Authentication → Settings → Authorized domains**, add your production/custom domain and `localhost` for local development if it is missing. Add specific preview domains if your team uses them.

## 5. Access protection and deployment

- The generator, admin page, and legacy component pages verify Firebase sessions on the server before rendering.
- Application APIs require an approved account; user management also requires the admin role.
- Session cookies last eight hours, are HttpOnly and SameSite=Lax, and are Secure in production.
- Session creation requires recent sign-in, and state-changing API requests require the same website origin to prevent CSRF.
- Current account status and role are checked on every protected request, rather than trusting an old role in the cookie.
- The stamp is stored in `assets/` and served through `/api/certificate-stamp`, which requires a valid team session. That API disables caching. Existing downloaded certificates are unaffected.
- Firestore and Storage are not used to store passwords or membership. Storage's existing deny-all rules are preserved. The included Firestore rules also deny direct client access. All team management uses the Firebase Admin SDK on the server.
- This uses server-rendered Next.js pages and API routes. Deploy it to Vercel with `next build`; Firebase Hosting's existing `out/` static configuration does not run these authentication endpoints.

Commit all new files, including `assets/authorised-signature-faza.png`, before deploying. Next.js file tracing includes the private stamp in the Vercel function.

See [session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies) and [custom claims](https://firebase.google.com/docs/auth/admin/custom-claims) for the Firebase design used here.

## Local authorization tests

The tests use a demo Firebase Authentication emulator and never use real project accounts:

```powershell
firebase.cmd emulators:start --only auth --project demo-faza-warranty --config tests/firebase-emulator.json
```

In a separate terminal, set the demo environment and start Next.js on port 3101:

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:NEXT_PUBLIC_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIREBASE_ADMIN_PROJECT_ID = 'demo-faza-warranty'
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-faza-warranty'
$env:NEXT_PUBLIC_FIREBASE_API_KEY = 'demo-key'
npm run dev -- --port 3101
```

In a third terminal:

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIREBASE_ADMIN_PROJECT_ID = 'demo-faza-warranty'
npm run auth:test
```

Do not set emulator variables in Vercel. The client emulator connection is restricted to project IDs beginning with `demo-`.
