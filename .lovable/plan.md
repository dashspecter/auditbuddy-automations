

## Add GDPR and Marketing Consent Checkboxes to Mystery Shopper Survey

### What Changes

Add two required checkboxes before the "Submit & Get Your Voucher" button on the public mystery shopper form:

1. **GDPR Consent (required)** -- "I agree that my personal data will be processed in accordance with the Privacy Policy."
2. **Marketing Consent (required)** -- "I agree to receive marketing communications (promotions, offers, news) via email or SMS."

Both must be checked before the form can be submitted. The consent values will be stored alongside the submission.

### Technical Details

**File: `src/pages/mystery-shopper/MysteryShopperForm.tsx`**
- Add two state variables: `gdprConsent` and `marketingConsent` (both `boolean`, default `false`)
- Add validation in the `validate()` function to require both checkboxes
- Add the two `Checkbox` components with labels between the questions section and the submit button
- Include `gdpr_consent: true` and `marketing_consent: true` in the `raw_answers` payload so the consent is recorded with the submission

**No database changes needed** -- the consent flags will be stored inside the existing `raw_answers` JSON column on `mystery_shopper_submissions`, keeping it simple and avoiding a migration.

### UI Layout

After the last survey question and before the submit button:

```text
+--------------------------------------------------+
| [x] I agree that my personal data will be        |
|     processed in accordance with the Privacy      |
|     Policy. *                                     |
|                                                   |
| [x] I agree to receive marketing communications  |
|     (promotions, offers, news) via email or       |
|     SMS. *                                        |
+--------------------------------------------------+
|        [ Submit & Get Your Voucher ]              |
+--------------------------------------------------+
```

Both checkboxes show a red error message if unchecked on submit attempt.
