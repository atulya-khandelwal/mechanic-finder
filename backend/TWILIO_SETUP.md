# Twilio SMS verification (signup)

Registration requires a **phone number** for both **customers** and **mechanics**. After you submit the form, the API:

1. Sends an **email** with a one-time code (existing SMTP / Resend setup).
2. Sends an **SMS** via **Twilio Verify** with a separate code.

You must enter **both** codes on step 2 of `/register`.

## 1. Create a Twilio account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up.
2. **Trial credit** applies to new accounts (enough to test). SMS to unverified numbers may be blocked on trial—see below.

## 2. Get API credentials

1. Open the [Twilio Console](https://console.twilio.com/).
2. On the dashboard, copy:
   - **Account SID**
   - **Auth Token** (click to reveal)

## 3. Create a Verify Service

1. In the left menu: **Verify** → **Services** (or [Verify Services](https://console.twilio.com/us1/develop/verify/services)).
2. Click **Create new** (or **Create new Service**).
3. Give it a friendly name (e.g. `Mobile Mechanic`).
4. Open the service and copy **Service SID** (starts with `VA…`).

SMS channel is enabled by default for Verify.

## 4. Trial: who can receive SMS?

On a **trial** account, Twilio usually only sends SMS to **verified** destination numbers.

1. Console → **Phone Numbers** → **Manage** → **Verified Caller IDs** (or [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)).
2. Add and verify your own mobile number (and any test numbers you need).

Until you **upgrade** the account, add every test destination here.

## 5. Configure the backend

In `backend/.env` (use `.env.example` as a template):

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_PHONE_REGION=IN
```

- **`DEFAULT_PHONE_REGION`**: Used when the user types a local number without `+country` (e.g. `9876543210` is parsed as India if `IN`).

Restart the API after changes.

## 6. Database: pending signups table

If `signup_verifications` does not exist yet, create it:

```bash
psql "$DATABASE_URL" -f database/migration-signup-verifications.sql
```

(From the repo root; adjust `DATABASE_URL` as needed.)

## 7. Local development without Twilio

For **non-production** only, you can skip real SMS:

```env
PHONE_VERIFY_SKIP=true
NODE_ENV=development
```

With skip mode, the server does **not** send SMS, and any **4–8 digit** SMS code is accepted for the phone step. **Do not set this in production.**

You still need **email** OTP (configure SMTP or rely on console log when `SMTP_HOST` is empty in development).

## 8. Production checklist

- [ ] `TWILIO_*` set; `PHONE_VERIFY_SKIP` **unset** or `false`.
- [ ] `NODE_ENV=production`.
- [ ] SMTP configured for email OTP.
- [ ] Twilio account **upgraded** (or all user numbers pre-verified—only realistic for testing).
- [ ] Users enter phone in **E.164** or valid local format; the API normalizes using `DEFAULT_PHONE_REGION`.

## 9. Phone number validation

- **Backend** (`backend/services/phone.util.js`) and **frontend** (`frontend/src/utils/phoneValidation.js`) both use **libphonenumber-js** with the same default region.
- Set **`DEFAULT_PHONE_REGION`** in `backend/.env` and **`VITE_DEFAULT_PHONE_REGION`** in `frontend/.env` to the same ISO code (e.g. `IN`) so local numbers without `+country` parse consistently.
- Users see clearer errors for: empty phone, unparseable input, wrong length for country, and numbers that fail validation.

## 10. Troubleshooting

| Issue | What to check |
|--------|----------------|
| `SMS verification is not configured` | Set all three `TWILIO_*` variables or use `PHONE_VERIFY_SKIP=true` in dev only. |
| Trial SMS not delivered | Add the destination number under **Verified Caller IDs** or upgrade the Twilio account. |
| `Invalid phone number` | Include country code (e.g. `+91 98765 43210`) or set `DEFAULT_PHONE_REGION` correctly. |
| Email works, SMS does not | Twilio logs: Console → **Monitor** → **Logs** → **Verify**. |

## 11. Cost after trial

Twilio bills per SMS and per Verify check according to [current pricing](https://www.twilio.com/verify/pricing). Verify bundles SMS in many regions; check the page for your country.

## References

- [Twilio Verify API](https://www.twilio.com/docs/verify/api)
- [Verify quickstart](https://www.twilio.com/docs/verify/quickstart)
