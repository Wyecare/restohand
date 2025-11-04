# Firebase Phone Authentication Setup Guide

## Current Status ✅

- [x] reCAPTCHA Enterprise configured with site key: `6LdrXPUrAAAAANl-8MUdSCjD8QnihY6y-FTP_z1D`
- [x] Phone number validation with libphonenumber-js
- [x] Comprehensive error handling for Firebase Auth
- [x] Frontend integration complete

## Required Firebase Console Configuration

### 1. Test Phone Numbers (for Development)

Add these to Firebase Console → Authentication → Sign-in method → Phone → Test phone numbers:

```
Phone Number: +1 650-555-3434
Verification Code: 123456

Phone Number: +91 98765 43210
Verification Code: 654321

Phone Number: +1 555-123-4567
Verification Code: 111111
```

### 2. Authorized Domains

Add these domains in Firebase Console → Authentication → Settings → Authorized domains:

```
localhost
localhost:4201          (current dev frontend)
your-production-domain.com
```

### 3. reCAPTCHA Configuration

Ensure your reCAPTCHA Enterprise site key `6LdrXPUrAAAAANl-8MUdSCjD8QnihY6y-FTP_z1D` has these domains configured:

- `localhost:4201` (development)
- Your production domain

## Testing Instructions

### Development Testing

1. Use the test phone numbers above during development
2. The verification codes are pre-configured and don't send actual SMS
3. Test with both valid and invalid phone formats

### Production Testing

1. Use real phone numbers
2. Monitor Firebase Console for SMS quota usage
3. Firebase Phone Auth SMS is FREE (unlike custom SMS providers)

## Error Scenarios to Test

### 1. Rate Limiting

- Try sending multiple verification codes quickly
- Should show: "Too many requests. Please try again in a few minutes."

### 2. Invalid Phone Numbers

- Test without country code: "9876543210"
- Test invalid format: "abc123"
- Should show validation error before Firebase call

### 3. reCAPTCHA Issues

- Disable JavaScript or block reCAPTCHA
- Should show: "reCAPTCHA verification failed. Please try again."

### 4. Network Issues

- Disconnect internet during verification
- Should show appropriate network error

## Implementation Details

### Phone Number Validation

- Uses `libphonenumber-js` for E.164 format validation
- Validates format before sending to Firebase
- Normalizes to E.164 format (+919876543210)

### reCAPTCHA Enterprise Integration

- Invisible reCAPTCHA for better UX
- Action-specific tokens for phone auth
- Proper error handling and retry logic

### Security Features

- QR code HMAC signature validation
- Time-based expiration for invitations
- Role-based access control
- No SMS costs (Firebase handles free SMS)

## Next Steps

1. Add test phone numbers in Firebase Console
2. Configure authorized domains
3. Test the complete flow
4. Monitor Firebase Console for any issues

Okay now we need the waiter UI interface design in the frontend and necessary backend if needed. So this is what I want, if the
customer doesnt want the self ordering, then waiter can take in the order. \

1. waiter comes in to the table. \
2. We already have the table data for restaurents in our system. So fetch all the tables in that restaurent, and then the waiter
   should initially see this table lists. \
3. click them to see the menus just like the customer would see. \
4. order for everyone or single person from the table, and this will be saved right? and then he can close this menu thing because
   that order will be recieved in the kitchen, but it shoule be back up if he clicks in the table again becuase there wil be an
   active order. \
5. Next, after they finish the meal, the waiter can go back, and get the order back up, and then instead of razor pay we can
   cimply fetch the restaurent's upi id, and show the qr to the customer and they can pay right away using their gpay or whatever.
   and as it is done with waiter's supervision he can manually click on payment done and mark it as paid. or they can deal with cash
   and he still can mark it as paid.
