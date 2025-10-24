import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PhoneAuthProvider, signInWithCredential, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, AlertCircle, QrCode, Smartphone } from 'lucide-react';
import { useValidateStaffQrQuery, useAcceptStaffQrMutation } from '@/store/api/staffSignupApi';
import { skipToken } from '@reduxjs/toolkit/query';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// Extend Window interface for reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

interface QrValidationData {
  role: string;
  displayName: string;
  restaurant: { id: string; name: string };
  expiresAt: string;
}

type SignupStep =
  | 'validate-qr'
  | 'phone-verification'
  | 'completing'
  | 'success'
  | 'error';

export default function StaffSignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<SignupStep>('validate-qr');
  const [qrData, setQrData] = useState<QrValidationData | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [error, setError] = useState('');

  const qrParam = searchParams.get('qr');

  // RTK Query for QR validation
  const {
    data: qrValidationResult,
    error: qrValidationError,
    isLoading: isValidatingQr,
  } = useValidateStaffQrQuery(qrParam ?? skipToken);

  // RTK Query for QR acceptance
  const [acceptQr, { isLoading: isAcceptingQr }] = useAcceptStaffQrMutation();

  const validateQrCode = useCallback(() => {
    if (!qrParam) {
      setError('No QR code found in URL. Please scan a valid staff invitation QR code.');
      setStep('error');
      return;
    }

    if (qrValidationError) {
      setError('Invalid or expired QR code');
      setStep('error');
      return;
    }

    if (qrValidationResult) {
      if (!qrValidationResult.valid) {
        setError(qrValidationResult.message || 'QR code validation failed');
        setStep('error');
        return;
      }

      if (qrValidationResult.data) {
        setQrData(qrValidationResult.data);
        setDisplayName(qrValidationResult.data.displayName || '');
        setStep('phone-verification');
      }
    }
  }, [qrParam, qrValidationResult, qrValidationError]);

  useEffect(() => {
    validateQrCode();
  }, [validateQrCode]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      const auth = getFirebaseAuth();
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
        }
      );
    }
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    try {
      setPhoneLoading(true);
      setError('');

      // Validate phone number format
      if (!isValidPhoneNumber(phoneNumber)) {
        setError('Please enter a valid phone number with country code (e.g., +91 9876543210)');
        return;
      }

      // Normalize phone number to E.164 format
      let normalizedPhone = phoneNumber;
      try {
        const parsedPhone = parsePhoneNumber(phoneNumber);
        if (parsedPhone) {
          normalizedPhone = parsedPhone.format('E.164');
        }
      } catch {
        // Fallback to original phone number if parsing fails
      }

      // Setup reCAPTCHA
      setupRecaptcha();
      const auth = getFirebaseAuth();

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        normalizedPhone,
        window.recaptchaVerifier
      );
      setVerificationId(confirmationResult.verificationId);

      toast({
        title: 'Verification code sent',
        description: 'Please check your phone for the verification code',
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to send verification code';

      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message: string };

        switch (firebaseError.code) {
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please try again in a few minutes.';
            break;
          case 'auth/invalid-phone-number':
            errorMessage = 'Invalid phone number. Please check the format and include country code.';
            break;
          case 'auth/recaptcha-not-enabled':
          case 'auth/missing-recaptcha-token':
            errorMessage = process.env.NODE_ENV === 'development'
              ? 'reCAPTCHA failed on localhost. Try test numbers: +1 650-555-3434 or use hosted version.'
              : 'reCAPTCHA verification failed. Please try again.';
            break;
          case 'auth/quota-exceeded':
            errorMessage = 'Daily SMS quota exceeded. Please try again tomorrow.';
            break;
          case 'auth/app-not-authorized':
            errorMessage = process.env.NODE_ENV === 'development'
              ? 'Domain not authorized. Add localhost to Firebase Console authorized domains.'
              : 'App not authorized for this domain.';
            break;
          default:
            errorMessage = firebaseError.message || 'Failed to send verification code';
        }
      }

      setError(errorMessage);

      // Reset reCAPTCHA verifier on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const verifyCodeAndSignup = async () => {
    if (!verificationCode || !verificationId || !qrParam) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setStep('completing');
      setError('');

      // Verify phone number with Firebase
      const auth = getFirebaseAuth();
      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      await signInWithCredential(auth, credential);

      // Normalize phone number for backend
      let normalizedPhone = phoneNumber;
      try {
        const parsedPhone = parsePhoneNumber(phoneNumber);
        if (parsedPhone) {
          normalizedPhone = parsedPhone.format('E.164');
        }
      } catch {
        // Fallback to original phone number if parsing fails
      }

      // Accept QR invitation using RTK Query
      const result = await acceptQr({
        qrData: qrParam,
        phoneNumber: normalizedPhone,
        displayName: displayName.trim() || undefined,
      }).unwrap();

      // Force Firebase token refresh to get updated custom claims
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true); // Force refresh
        // Wait a bit for claims to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setStep('success');

      toast({
        title: `Welcome to ${result.user.restaurantName}!`,
        description: `You've successfully joined as ${result.user.role}`,
      });

      // Redirect to appropriate dashboard after 3 seconds
      setTimeout(() => {
        const dashboardPath = qrData?.role === 'chef' ? '/kitchen' : '/service';
        navigate(dashboardPath);
      }, 3000);
    } catch (err: unknown) {
      let errorMessage = 'Failed to complete signup';

      if (err && typeof err === 'object') {
        if ('data' in err && err.data && typeof err.data === 'object' && 'message' in err.data) {
          errorMessage = (err.data as { message: string }).message;
        } else if ('message' in err) {
          errorMessage = (err as { message: string }).message;
        }
      }

      setError(errorMessage);
      setStep('phone-verification');
    }
  };

  if (step === 'validate-qr' && isValidatingQr) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <QrCode className="h-12 w-12 text-primary animate-pulse" />
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground text-center">
                Validating QR code...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid QR Code
            </CardTitle>
            <CardDescription>
              The QR code is invalid, expired, or corrupted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => navigate('/staff-login')}
            >
              Go to Staff Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Welcome to {qrData?.restaurant.name}!
            </CardTitle>
            <CardDescription>
              Your account has been successfully created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  You've joined as{' '}
                  <strong className="text-primary capitalize">
                    {qrData?.role}
                  </strong>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Redirecting to your dashboard...
                </p>
              </div>
              <LoadingSpinner size="sm" className="mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Join {qrData?.restaurant.name}
          </CardTitle>
          <CardDescription>
            Complete your registration as{' '}
            <strong className="text-primary capitalize">{qrData?.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Your Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Enter your full name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={verificationId !== ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={verificationId !== ''}
            />
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-muted-foreground">
                For testing: +1 650-555-3434 or +91 98765 43210
              </p>
            )}
          </div>

          {verificationId && (
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
            </div>
          )}

          <div className="space-y-2">
            {!verificationId ? (
              <Button
                onClick={sendVerificationCode}
                disabled={phoneLoading || !phoneNumber}
                className="w-full"
              >
                {phoneLoading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            ) : (
              <Button
                onClick={verifyCodeAndSignup}
                disabled={isAcceptingQr || !verificationCode || step === 'completing'}
                className="w-full"
              >
                {step === 'completing'
                  ? 'Completing Registration...'
                  : 'Complete Registration'}
              </Button>
            )}
          </div>

          <div id="recaptcha-container"></div>
        </CardContent>
      </Card>
    </div>
  );
}
