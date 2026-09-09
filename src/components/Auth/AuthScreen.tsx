import React, { useState, useEffect, useRef } from 'react';
import {
  Fuel,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Building2,
  User,
  KeyRound,
  Lock,
  ChevronRight,
  Smartphone,
  MapPin,
  Users,
  ChevronLeft,
  Eye,
  EyeOff,
  Sparkles,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { AuthUser, StationConfig, UserRole } from '../../types';
import {
  registerAccount,
  verifyOtpCode,
  requestLogin,
  loginWithPassword,
  loginAttendantWithPin,
  requestAttendantPinReset,
  resetAttendantPinWithOtp,
  resendOtpCode,
  sendFirebasePasswordReset,
  getAllAccounts,
  formatPhoneNumber,
  checkFirebaseEmailSignInLink,
  signInWithGoogle,
} from '../../services/auth';
import { validatePinStrength } from '../../utils/crypto';
import { verifyStationCodeStatus, verifyStationCodeStatusAsync, getCompanies, getStations } from '../../services/storage';
import { firebaseConfig } from '../../services/firebase';

interface AuthScreenProps {
  stations: StationConfig[];
  onAuthenticated: (user: AuthUser) => void;
}

type AuthMode = 'signup' | 'signin' | 'verify' | 'forgot_password' | 'forgot_pin';
type AuthMethod = 'phone' | 'email';
type SelectedRole = 'attendant' | 'supervisor';
type StationSetupMode = 'new' | 'existing';
type SignInTab = 'pin' | 'firebase';

export const AuthScreen: React.FC<AuthScreenProps> = ({ stations, onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [method, setMethod] = useState<AuthMethod>('phone');

  // Step 1: Role Selection ('select' | 'form')
  const [roleStep, setRoleStep] = useState<'select' | 'form'>('select');
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('attendant');

  // Common Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [staffId, setStaffId] = useState('');

  // Attendant Personal PIN Registration State
  const [personalPin, setPersonalPin] = useState('');
  const [confirmPersonalPin, setConfirmPersonalPin] = useState('');
  const [showPersonalPin, setShowPersonalPin] = useState(false);
  const [showConfirmPersonalPin, setShowConfirmPersonalPin] = useState(false);

  // Password Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  // Attendant PIN Login State
  const [signInTab, setSignInTab] = useState<SignInTab>('pin');
  const [attendantStaffIdInput, setAttendantStaffIdInput] = useState('');
  const [attendantPinInput, setAttendantPinInput] = useState('');
  const [showAttendantPin, setShowAttendantPin] = useState(false);
  const [pinLockoutSeconds, setPinLockoutSeconds] = useState(0);

  // Attendant Forgot PIN Recovery State
  const [forgotPinIdentifier, setForgotPinIdentifier] = useState('');
  const [forgotPinOtp, setForgotPinOtp] = useState('');
  const [forgotPinNewPin, setForgotPinNewPin] = useState('');
  const [forgotPinConfirmPin, setForgotPinConfirmPin] = useState('');
  const [showForgotPinNew, setShowForgotPinNew] = useState(false);
  const [showForgotPinConfirm, setShowForgotPinConfirm] = useState(false);
  const [forgotPinStep, setForgotPinStep] = useState<'request' | 'verify_and_set'>('request');
  const [forgotPinTargetUser, setForgotPinTargetUser] = useState<AuthUser | null>(null);

  // Attendant Form Fields
  const [attendantStationCode, setAttendantStationCode] = useState('');
  const [attendantStationOption, setAttendantStationOption] = useState<'code' | 'later'>('code');

  // Supervisor Form Fields (Station Setup)
  const [stationSetupMode, setStationSetupMode] = useState<StationSetupMode>('new');
  const [supervisorCompanyName, setSupervisorCompanyName] = useState('');
  const [supervisorStationName, setSupervisorStationName] = useState('');
  const [supervisorStationCode, setSupervisorStationCode] = useState('');
  const [supervisorStationLocation, setSupervisorStationLocation] = useState('');
  const [supervisorExistingStationId, setSupervisorExistingStationId] = useState('');

  // Sign In Form Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginWithPass, setLoginWithPass] = useState(false);

  // Verification State
  const [activeIdentifier, setActiveIdentifier] = useState('');
  const [activeAuthType, setActiveAuthType] = useState<AuthMethod>('phone');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [existingAccounts, setExistingAccounts] = useState<AuthUser[]>([]);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Lockout Countdown Timer
  useEffect(() => {
    let timer: any;
    if (pinLockoutSeconds > 0) {
      timer = setInterval(() => {
        setPinLockoutSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pinLockoutSeconds]);

  // Check for email sign-in link on mount
  useEffect(() => {
    checkFirebaseEmailSignInLink().then((verifiedUser) => {
      if (verifiedUser) {
        setIsVerifiedSuccess(true);
        setSuccessMsg('Email successfully verified via Firebase Authentication!');
        setTimeout(() => {
          onAuthenticated(verifiedUser);
        }, 800);
      }
    });
  }, [onAuthenticated]);

  // Live verification of attendant station code against database records
  const attendantStationVerification = React.useMemo(() => {
    return verifyStationCodeStatus(attendantStationCode);
  }, [attendantStationCode, stations]);

  // Load existing accounts on mount & mode change
  useEffect(() => {
    const accs = getAllAccounts();
    setExistingAccounts(accs);
  }, [mode]);

  // Resend Timer Countdown
  useEffect(() => {
    let timer: any;
    if (mode === 'verify' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, resendCooldown]);

  // Focus first OTP box when entering verify mode
  useEffect(() => {
    if (mode === 'verify') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [mode]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPhone(raw);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of 6-digit code
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const newOtp = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newOtp[i] = pasted[i] || '';
        }
        setOtpDigits(newOtp);
        const nextFocus = Math.min(pasted.length, 5);
        inputRefs.current[nextFocus]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);

    // Auto advance focus
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Submit Attendant Sign Up
  const handleAttendantSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const currentIdentifier = method === 'email' ? email.trim() : phone.trim();

    if (method === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentIdentifier)) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
    } else {
      const cleanedPhone = currentIdentifier.replace(/[\s\-()]/g, '');
      if (cleanedPhone.length < 9) {
        setErrorMsg('Please enter a valid Ghana phone number (e.g. 024 123 4567).');
        return;
      }
    }

    let finalStationCode: string | undefined = undefined;
    if (attendantStationOption === 'code' && attendantStationCode.trim()) {
      // Strict validation: Station Code must exist in database
      const check = await verifyStationCodeStatusAsync(attendantStationCode);
      if (!check.valid || !check.station) {
        setErrorMsg(
          check.message ||
            `Station Code "${attendantStationCode.trim()}" is invalid or not registered. If you do not have a station code, choose "Join / Request Later" below.`
        );
        return;
      }
      finalStationCode = attendantStationCode.trim();
    } else if (attendantStationOption === 'code' && !attendantStationCode.trim()) {
      setErrorMsg('Please enter your official Station Code or switch to "Join / Request Later".');
      return;
    }

    if (!password) {
      setErrorMsg('Please create a password for your account.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!confirmPassword) {
      setErrorMsg('Please confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please ensure both passwords match exactly.');
      return;
    }

    // Personal PIN Verification for Attendants
    const cleanPin = personalPin.trim();
    const cleanConfirmPin = confirmPersonalPin.trim();

    if (!cleanPin) {
      setErrorMsg('Please create a 6-digit Personal PIN for your Attendant account.');
      return;
    }

    if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setErrorMsg('Personal PIN must be exactly 6 numeric digits.');
      return;
    }

    if (!cleanConfirmPin) {
      setErrorMsg('Please confirm your 6-digit Personal PIN.');
      return;
    }

    if (cleanPin !== cleanConfirmPin) {
      setErrorMsg('Personal PIN and Confirm Personal PIN do not match.');
      return;
    }

    const pinCheck = validatePinStrength(cleanPin);
    if (!pinCheck.valid) {
      setErrorMsg(pinCheck.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerAccount({
        fullName: fullName.trim(),
        authType: method,
        identifier: currentIdentifier,
        password: password.trim() || undefined,
        personalPin: cleanPin,
        confirmPersonalPin: cleanConfirmPin,
        role: 'attendant',
        stationCode: finalStationCode,
        staffId: staffId.trim() || undefined,
      });

      if (result.user && result.user.isVerified) {
        setIsVerifiedSuccess(true);
        setSuccessMsg('Account successfully created in Firebase Authentication! Launching forecourt console...');
        setTimeout(() => {
          onAuthenticated(result.user!);
        }, 800);
        return;
      }

      setActiveIdentifier(currentIdentifier);
      setActiveAuthType(method);
      setSuccessMsg(result.message);
      setMode('verify');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account via Firebase Authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Attendant Direct PIN Login (Staff ID + 6-digit PIN)
  const handleAttendantPinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const sId = attendantStaffIdInput.trim();
    const pin = attendantPinInput.trim();

    if (!sId) {
      setErrorMsg('Please enter your official Attendant Staff ID (e.g. ATT-101).');
      return;
    }

    if (!pin) {
      setErrorMsg('Please enter your 6-digit Personal PIN.');
      return;
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setErrorMsg('Personal PIN must be exactly 6 numeric digits.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await loginAttendantWithPin(sId, pin);
      setIsSubmitting(false);

      if (res.locked) {
        const secs = res.lockRemainingSecs || 300;
        setPinLockoutSeconds(secs);
        setErrorMsg(res.message);
        return;
      }

      if (res.success && res.user) {
        setIsVerifiedSuccess(true);
        setSuccessMsg(res.message);
        setTimeout(() => {
          onAuthenticated(res.user!);
        }, 700);
      } else {
        setErrorMsg(res.message || 'Authentication failed. Please check your Staff ID and PIN.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to authenticate with Personal PIN.');
    }
  };

  // Request PIN Reset with OTP
  const handleRequestForgotPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const id = forgotPinIdentifier.trim();
    if (!id) {
      setErrorMsg('Please enter your Attendant Staff ID, registered phone number, or email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await requestAttendantPinReset(id);
      setIsSubmitting(false);

      if (res.success && res.user) {
        setForgotPinTargetUser(res.user);
        setForgotPinStep('verify_and_set');
        setSuccessMsg(res.message);
        setResendCooldown(60);
      } else {
        setErrorMsg(res.message || 'Could not locate account for PIN reset.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to request PIN reset.');
    }
  };

  // Complete PIN Reset with OTP and New PIN
  const handleResetForgotPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const otp = forgotPinOtp.trim();
    const newPin = forgotPinNewPin.trim();
    const confirmPin = forgotPinConfirmPin.trim();

    if (!otp || otp.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code sent to your contact.');
      return;
    }

    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setErrorMsg('New Personal PIN must be exactly 6 numeric digits.');
      return;
    }

    if (!confirmPin) {
      setErrorMsg('Please confirm your new Personal PIN.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('New Personal PIN and Confirm PIN do not match.');
      return;
    }

    const strengthCheck = validatePinStrength(newPin);
    if (!strengthCheck.valid) {
      setErrorMsg(strengthCheck.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const identifier = forgotPinTargetUser?.id || forgotPinTargetUser?.staffId || forgotPinIdentifier.trim();
      const res = await resetAttendantPinWithOtp({
        userIdOrStaffId: identifier,
        otpCode: otp,
        newPin,
        confirmNewPin: confirmPin,
      });
      setIsSubmitting(false);

      if (res.success && res.user) {
        setIsVerifiedSuccess(true);
        setSuccessMsg('Personal PIN successfully reset! Signing in...');
        setTimeout(() => {
          onAuthenticated(res.user!);
        }, 800);
      } else {
        setErrorMsg(res.message || 'Failed to reset PIN.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to reset PIN.');
    }
  };

  // Submit Supervisor / Manager Sign Up
  const handleSupervisorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const currentIdentifier = method === 'email' ? email.trim() : phone.trim();

    if (method === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentIdentifier)) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
    } else {
      const cleanedPhone = currentIdentifier.replace(/[\s\-()]/g, '');
      if (cleanedPhone.length < 9) {
        setErrorMsg('Please enter a valid Ghana phone number (e.g. 024 123 4567).');
        return;
      }
    }

    if (stationSetupMode === 'new') {
      if (!supervisorStationName.trim()) {
        setErrorMsg('Please enter the station branch name.');
        return;
      }
      if (!supervisorStationCode.trim()) {
        setErrorMsg('Please enter the official Station Code (e.g. STN-001, GO-ACC-012, 004).');
        return;
      }
    } else {
      if (!supervisorExistingStationId) {
        setErrorMsg('Please select an existing registered station.');
        return;
      }
    }

    if (!password) {
      setErrorMsg('Please create a password for your account.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!confirmPassword) {
      setErrorMsg('Please confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please ensure both passwords match exactly.');
      return;
    }

    setIsSubmitting(true);

    try {
      let result;
      if (stationSetupMode === 'new') {
        result = await registerAccount({
          fullName: fullName.trim(),
          authType: method,
          identifier: currentIdentifier,
          password: password.trim() || undefined,
          role: 'supervisor',
          stationMode: 'new',
          companyName: supervisorCompanyName.trim() || 'Independent Station',
          stationName: supervisorStationName.trim(),
          stationCode: supervisorStationCode.trim().toUpperCase(),
          stationLocation: supervisorStationLocation.trim() || undefined,
          staffId: staffId.trim() || undefined,
        });
      } else {
        const existingSt = stations.find((s) => s.id === supervisorExistingStationId) || stations[0];
        result = await registerAccount({
          fullName: fullName.trim(),
          authType: method,
          identifier: currentIdentifier,
          password: password.trim() || undefined,
          role: 'supervisor',
          stationMode: 'existing',
          companyId: existingSt.id,
          stationCode: existingSt.stationCode,
          stationName: existingSt.name,
          companyName: existingSt.companyName,
          staffId: staffId.trim() || undefined,
        });
      }

      if (result.user && result.user.isVerified) {
        setIsVerifiedSuccess(true);
        setSuccessMsg('Supervisor account registered and station created in Cloud Firestore! Launching dashboard...');
        setTimeout(() => {
          onAuthenticated(result.user!);
        }, 800);
        return;
      }

      setActiveIdentifier(currentIdentifier);
      setActiveAuthType(method);
      setSuccessMsg(result.message);
      setMode('verify');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create supervisor account via Firebase Authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Sign In for Existing Users
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const id = loginIdentifier.trim();
    if (!id) {
      setErrorMsg('Please enter your registered phone number or email.');
      return;
    }

    const detectedAuthType: AuthMethod = id.includes('@') ? 'email' : 'phone';

    // Password-based sign in
    if (loginWithPass && loginPassword.trim()) {
      setIsSubmitting(true);
      const res = await loginWithPassword(id, detectedAuthType, loginPassword.trim(), selectedRole);
      setIsSubmitting(false);
      if (res.success && res.user) {
        setIsVerifiedSuccess(true);
        setSuccessMsg(res.message || 'Successfully signed in!');
        setTimeout(() => {
          onAuthenticated(res.user!);
        }, 600);
        return;
      } else {
        setErrorMsg(res.message || 'Login failed. Please check your credentials.');
        return;
      }
    }

    // OTP / Link based sign in
    setIsSubmitting(true);
    try {
      const res = await requestLogin(id, detectedAuthType);
      if (!res.found || !res.user) {
        setErrorMsg(res.message || 'No registered account found. Please create an account.');
        setIsSubmitting(false);
        return;
      }

      setActiveIdentifier(res.user.identifier);
      setActiveAuthType(res.user.authType);
      setSuccessMsg(res.message || 'Verification passcode dispatched via Firebase.');
      setMode('verify');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code via Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const enteredCode = otpDigits.join('');
    if (enteredCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await verifyOtpCode(activeIdentifier, activeAuthType, enteredCode);

      if (res.success && res.user) {
        setIsVerifiedSuccess(true);
        setSuccessMsg(res.message || 'Verification complete! Launching forecourt console...');
        setTimeout(() => {
          onAuthenticated(res.user!);
        }, 900);
      } else {
        setErrorMsg(
          res.message ||
            (res.attemptsRemaining !== undefined
              ? `Invalid verification code. ${res.attemptsRemaining} attempts remaining.`
              : 'Invalid verification code. Please check the code and try again.')
        );
        // Clear digits on error
        setOtpDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await resendOtpCode(activeIdentifier, activeAuthType);
      if (res.success) {
        setSuccessMsg(res.message);
        setResendCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMsg(res.message);
        if (res.cooldownRemaining) {
          setResendCooldown(res.cooldownRemaining);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Firebase Password Reset
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailToReset = resetEmail.trim();
    if (!emailToReset) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await sendFirebasePasswordReset(emailToReset);
      if (res.success) {
        setResetSentSuccess(true);
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Google Authentication
  const handleGoogleAuth = async (targetRole: SelectedRole = selectedRole) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let stData = undefined;
      if (
        targetRole === 'supervisor' &&
        stationSetupMode === 'new' &&
        supervisorStationName.trim() &&
        supervisorStationCode.trim()
      ) {
        stData = {
          stationMode: 'new' as const,
          stationName: supervisorStationName.trim(),
          stationCode: supervisorStationCode.trim().toUpperCase(),
          companyName: supervisorCompanyName.trim() || 'Independent Station',
          stationLocation: supervisorStationLocation.trim() || undefined,
        };
      }
      const res = await signInWithGoogle(targetRole, stData);
      setIsSubmitting(false);

      if (res.success && res.user) {
        setIsVerifiedSuccess(true);
        setSuccessMsg(res.message || 'Authenticated successfully with Google! Launching console...');
        setTimeout(() => {
          onAuthenticated(res.user!);
        }, 800);
      } else if (res.message) {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Google Authentication failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-black text-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden">
      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="recaptcha-container" />

      {/* Forecourt Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header & Logo */}
      <div className="w-full max-w-lg text-center mb-6 z-10 space-y-3">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-500/20">
            <Fuel className="w-5 h-5 text-stone-950" />
          </div>
          <div className="text-left">
            <span className="text-sm font-black tracking-wider text-white uppercase block leading-none">
              FUEL STATION PORTAL
            </span>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest leading-none mt-0.5">
              Forecourt Digital Systems
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {mode === 'signup' && roleStep === 'select' && 'CREATE ACCOUNT'}
            {mode === 'signup' && roleStep === 'form' && (selectedRole === 'attendant' ? 'Attendant Registration' : 'Supervisor / Manager Setup')}
            {mode === 'signin' && 'Sign In to Station Console'}
            {mode === 'verify' && 'Verify Your Contact'}
            {mode === 'forgot_password' && 'Reset Account Password'}
          </h1>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            {mode === 'signup' && roleStep === 'select' && 'Choose your account type to proceed with official registration:'}
            {mode === 'signup' && roleStep === 'form' && (selectedRole === 'attendant' ? 'Enter your details and official Station Code to connect to your assigned branch.' : 'Configure or connect your station branch to manage forecourt sales & roster.')}
            {mode === 'signin' && 'Enter your phone number or email to access your forecourt dashboard.'}
            {mode === 'forgot_password' && 'Enter your registered email address and we will dispatch a password recovery link via Firebase Authentication.'}
            {mode === 'verify' && (
              <span>
                Enter the 6-digit security code sent via Firebase Authentication to{' '}
                <strong className="text-amber-300 font-mono">
                  {activeAuthType === 'phone' ? formatPhoneNumber(activeIdentifier) : activeIdentifier}
                </strong>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-lg bg-stone-900/90 border border-stone-800 rounded-3xl shadow-2xl backdrop-blur-xl p-5 sm:p-7 relative z-10">
        {/* Navigation Tabs (Create Account / Sign In) */}
        {mode !== 'verify' && mode !== 'forgot_password' && (
          <div className="grid grid-cols-2 p-1 bg-stone-950 rounded-2xl border border-stone-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Global Alert Banners */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-2xl flex flex-col gap-2.5 text-xs text-rose-200 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
            {(errorMsg.includes('auth/operation-not-allowed') || errorMsg.includes('Email/Password')) && (
              <div className="mt-1 p-2.5 bg-stone-900/90 border border-stone-700/80 rounded-xl space-y-2 text-stone-200">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-amber-400 text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Instant Alternative: Sign in with Google
                  </span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleGoogleAuth(selectedRole)}
                    className="px-3 py-1.5 bg-white text-stone-900 hover:bg-stone-100 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Globe className="w-3.5 h-3.5 text-stone-800" />
                    Continue with Google
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 leading-normal">
                  Google authentication is available, or you can sign up directly with Email &amp; Password on project <code className="text-amber-300">{firebaseConfig.projectId}</code>. To enable or verify email credentials in Firebase Console: go to <strong>Build &gt; Authentication &gt; Sign-in method</strong>, ensure <strong>Email/Password</strong> is set to <strong>Enable</strong>, and Save.
                </p>
              </div>
            )}
          </div>
        )}

        {successMsg && !isVerifiedSuccess && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1 OF SIGNUP: ROLE SELECTION ([ ATTENDANT ] vs [ SUPERVISOR / MANAGER ]) */}
        {/* ========================================================================= */}
        {mode === 'signup' && roleStep === 'select' && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-stone-300 uppercase tracking-wider text-center">
              Select Account Type
            </p>

            <div className="grid grid-cols-1 gap-3.5">
              {/* Option 1: ATTENDANT */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('attendant');
                  setRoleStep('form');
                  setErrorMsg(null);
                }}
                className="group w-full p-4 rounded-2xl bg-stone-950 hover:bg-stone-850 border-2 border-stone-800 hover:border-emerald-500 text-left transition-all cursor-pointer relative overflow-hidden shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Fuel className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-white tracking-tight uppercase group-hover:text-emerald-400 transition-colors">
                        [ ATTENDANT ]
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Self-Registration
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      For forecourt pump attendants. Enter your name, contact, password and official <strong>Station Code</strong> to link to your station.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all self-center" />
                </div>
              </button>

              {/* Option 2: SUPERVISOR / MANAGER */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('supervisor');
                  setRoleStep('form');
                  setErrorMsg(null);
                }}
                className="group w-full p-4 rounded-2xl bg-stone-950 hover:bg-stone-850 border-2 border-stone-800 hover:border-amber-500 text-left transition-all cursor-pointer relative overflow-hidden shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-white tracking-tight uppercase group-hover:text-amber-400 transition-colors">
                        [ SUPERVISOR / MANAGER ]
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Station Lead
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      For station supervisors and managers. Configure station details, oversee team roster, pump allocations &amp; daily accounting.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all self-center" />
                </div>
              </button>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-stone-900 px-2 text-stone-500 font-bold">Or Instant Auth</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleGoogleAuth('supervisor')}
              className="w-full py-3 px-4 rounded-2xl bg-stone-950 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Continue with Google Account</span>
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-stone-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: ATTENDANT REGISTRATION FORM */}
        {/* ========================================================================= */}
        {mode === 'signup' && roleStep === 'form' && selectedRole === 'attendant' && (
          <form onSubmit={handleAttendantSignUp} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <button
                type="button"
                onClick={() => setRoleStep('select')}
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
              >
                <ChevronLeft className="w-4 h-4" /> Change Role
              </button>
              <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                Attendant Registration
              </span>
            </div>

            {/* Verification Method Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Verification Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('phone')}
                  className={`py-2 px-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    method === 'phone'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Mobile SMS (+233)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`py-2 px-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    method === 'email'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Account</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Daniel Mensah"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
              />
            </div>

            {/* Phone or Email */}
            {method === 'phone' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Ghana Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="024 123 4567 or +233 24 123 4567"
                  required
                  className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. attendant@fuelstation.com"
                  required
                  className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
                />
              </div>
            )}

            {/* Create Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Create Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Create Password *
                  </span>
                  <span className="text-[9.5px] text-stone-500">Min. 6 chars</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create secure password"
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Confirm Password *
                  </span>
                  {confirmPassword ? (
                    password === confirmPassword ? (
                      <span className="text-[9.5px] text-emerald-400 font-bold flex items-center gap-0.5">
                        ✓ Match
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-rose-400 font-bold flex items-center gap-0.5">
                        Mismatch
                      </span>
                    )
                  ) : null}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className={`w-full bg-stone-950 border ${
                      confirmPassword && password === confirmPassword
                        ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-emerald-500'
                        : confirmPassword && password !== confirmPassword
                        ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-stone-800 focus:border-emerald-500 focus:ring-emerald-500'
                    } focus:ring-1 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Attendant 6-Digit Personal PIN & Confirm PIN */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-emerald-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Personal Security PIN (6 Digits) *</span>
                </label>
                <span className="text-[9.5px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Shared Phone Access
                </span>
              </div>
              <p className="text-[10px] text-stone-400 leading-relaxed">
                Your 6-digit Personal PIN allows you to quickly and securely switch into your account on shared station phones and POS devices without exposing your credentials.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Personal PIN */}
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-stone-300 flex items-center justify-between">
                    <span>Personal PIN *</span>
                    <span className={`text-[9.5px] font-mono font-bold ${personalPin.length === 6 ? 'text-emerald-400' : 'text-stone-500'}`}>
                      {personalPin.length}/6 Digits
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPersonalPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={personalPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPersonalPin(val);
                      }}
                      placeholder="6-digit PIN"
                      required
                      className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-2.5 font-mono text-sm tracking-widest text-white placeholder-stone-600 outline-hidden transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPersonalPin(!showPersonalPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                    >
                      {showPersonalPin ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Personal PIN */}
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-stone-300 flex items-center justify-between">
                    <span>Confirm Personal PIN *</span>
                    {confirmPersonalPin ? (
                      personalPin === confirmPersonalPin ? (
                        <span className="text-[9.5px] text-emerald-400 font-bold">✓ Match</span>
                      ) : (
                        <span className="text-[9.5px] text-rose-400 font-bold">Mismatch</span>
                      )
                    ) : null}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPersonalPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={confirmPersonalPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setConfirmPersonalPin(val);
                      }}
                      placeholder="Confirm 6-digit PIN"
                      required
                      className={`w-full bg-stone-900 border ${
                        confirmPersonalPin && personalPin === confirmPersonalPin
                          ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-emerald-500'
                          : confirmPersonalPin && personalPin !== confirmPersonalPin
                          ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500'
                          : 'border-stone-800 focus:border-emerald-500 focus:ring-emerald-500'
                      } rounded-xl p-2.5 font-mono text-sm tracking-widest text-white placeholder-stone-600 outline-hidden transition-all pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPersonalPin(!showConfirmPersonalPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                    >
                      {showConfirmPersonalPin ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {personalPin.length === 6 && (
                <div className="pt-1">
                  {(() => {
                    const check = validatePinStrength(personalPin);
                    if (!check.valid) {
                      return (
                        <div className="text-[10px] text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{check.message}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Strong, secure 6-digit PIN</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Station Assignment: Option 1 (Code) vs Option 2 (Later) */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-stone-300 uppercase tracking-wider block">
                Station Membership
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendantStationOption('code')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    attendantStationOption === 'code'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>I Have Station Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttendantStationOption('later');
                    setAttendantStationCode('');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    attendantStationOption === 'later'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Join / Request Later</span>
                </button>
              </div>

              {attendantStationOption === 'code' ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" /> Official Station Code *
                    </label>
                    <span className="text-[9px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Provided by Station Manager
                    </span>
                  </div>
                  <input
                    type="text"
                    value={attendantStationCode}
                    onChange={(e) => setAttendantStationCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SO-ACC-012, SO-ACC-004, SO-TMA-001"
                    required={attendantStationOption === 'code'}
                    className={`w-full font-mono bg-stone-950 border ${
                      attendantStationVerification.status === 'valid'
                        ? 'border-emerald-500 text-emerald-300'
                        : attendantStationVerification.status === 'not_found'
                        ? 'border-rose-500 text-rose-300'
                        : 'border-stone-800 text-white'
                    } focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-xs placeholder-stone-600 outline-hidden font-bold tracking-wider transition-all`}
                  />

                  {/* Station Verification Feedback Badge */}
                  {attendantStationVerification.status === 'valid' && attendantStationVerification.station && (
                    <div className="p-3 bg-emerald-950/70 rounded-2xl border border-emerald-500/60 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                          {attendantStationVerification.station.stationCode}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {attendantStationVerification.station.name}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold ml-auto">
                          ✓ Valid Station
                        </span>
                      </div>
                      {attendantStationVerification.station.locationName && (
                        <p className="text-[10px] text-emerald-200/80 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          {attendantStationVerification.station.locationName}
                        </p>
                      )}
                      <p className="text-[9.5px] text-emerald-300/80 pt-1 border-t border-emerald-800/40 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> You will be automatically assigned to this station.
                      </p>
                    </div>
                  )}

                  {attendantStationVerification.status === 'not_found' && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[11px] text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        Station Code "{attendantStationCode.trim()}" not found. Please check with your supervisor, or choose "Join / Request Later".
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-1.5 text-xs text-stone-300 animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-[11px]">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Create Account Now, Connect Station Later</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    You can create your account right away. After logging in, you can search for your station branch or submit a request for your Station Manager to approve.
                  </p>
                </div>
              )}
            </div>

            {/* Optional Staff ID */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-400">Staff ID (Optional)</label>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. ATT-042 (Optional)"
                className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 rounded-2xl p-2.5 text-xs text-white placeholder-stone-600 outline-hidden"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Firebase Verification...</span>
                </>
              ) : (
                <>
                  <span>Verify Contact &amp; Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-stone-900 px-2 text-stone-500 font-bold">Or Instant Auth</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleGoogleAuth('attendant')}
              className="w-full py-3 px-4 rounded-2xl bg-stone-950 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Continue with Google Account</span>
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SUPERVISOR / MANAGER REGISTRATION FORM */}
        {/* ========================================================================= */}
        {mode === 'signup' && roleStep === 'form' && selectedRole === 'supervisor' && (
          <form onSubmit={handleSupervisorSignUp} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <button
                type="button"
                onClick={() => setRoleStep('select')}
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
              >
                <ChevronLeft className="w-4 h-4" /> Change Role
              </button>
              <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                Supervisor / Manager
              </span>
            </div>

            {/* Verification Method Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Verification Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('phone')}
                  className={`py-2 px-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    method === 'phone'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Mobile SMS (+233)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`py-2 px-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    method === 'email'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Account</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Supervisor / Manager Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kofi Asare"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
              />
            </div>

            {/* Phone or Email */}
            {method === 'phone' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" /> Ghana Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="024 123 4567 or +233 24 123 4567"
                  required
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. supervisor@fuelstation.com"
                  required
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
                />
              </div>
            )}

            {/* Create Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Create Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Create Password *
                  </span>
                  <span className="text-[9.5px] text-stone-500">Min. 6 chars</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create secure password"
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Confirm Password *
                  </span>
                  {confirmPassword ? (
                    password === confirmPassword ? (
                      <span className="text-[9.5px] text-emerald-400 font-bold flex items-center gap-0.5">
                        ✓ Match
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-rose-400 font-bold flex items-center gap-0.5">
                        Mismatch
                      </span>
                    )
                  ) : null}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className={`w-full bg-stone-950 border ${
                      confirmPassword && password === confirmPassword
                        ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-emerald-500'
                        : confirmPassword && password !== confirmPassword
                        ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-stone-800 focus:border-amber-500 focus:ring-amber-500'
                    } focus:ring-1 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Station Setup / Connection */}
            <div className="space-y-2.5 pt-2 border-t border-stone-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" /> Station Branch Setup
                </label>
                <div className="flex rounded-lg bg-stone-950 p-0.5 border border-stone-800 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setStationSetupMode('new')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      stationSetupMode === 'new' ? 'bg-amber-500 text-stone-950 font-extrabold' : 'text-stone-400'
                    }`}
                  >
                    Configure Station
                  </button>
                  <button
                    type="button"
                    onClick={() => setStationSetupMode('existing')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      stationSetupMode === 'existing' ? 'bg-amber-500 text-stone-950 font-extrabold' : 'text-stone-400'
                    }`}
                  >
                    Existing Station
                  </button>
                </div>
              </div>

              {stationSetupMode === 'new' ? (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-stone-400">Oil Marketing Company (OMC)</label>
                    <input
                      type="text"
                      value={supervisorCompanyName}
                      onChange={(e) => setSupervisorCompanyName(e.target.value)}
                      placeholder="e.g. GOIL, Shell, TotalEnergies, StarOil, Allied, Independent"
                      required
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-stone-400">Station Branch Name *</label>
                      <input
                        type="text"
                        value={supervisorStationName}
                        onChange={(e) => setSupervisorStationName(e.target.value)}
                        placeholder="e.g. Spintex Road Express"
                        required
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-stone-400">Official Station Code *</label>
                      <input
                        type="text"
                        value={supervisorStationCode}
                        onChange={(e) => setSupervisorStationCode(e.target.value.toUpperCase())}
                        placeholder="e.g. STN-ACC-001"
                        required
                        className="w-full bg-stone-900 border border-stone-800 font-mono font-bold rounded-xl px-3 py-2 text-xs text-amber-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-stone-400">Station Location / Town</label>
                    <input
                      type="text"
                      value={supervisorStationLocation}
                      onChange={(e) => setSupervisorStationLocation(e.target.value)}
                      placeholder="e.g. Spintex Road, Accra"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <p className="text-[9.5px] text-stone-500">
                    Attendants will use this Station Code to automatically register and join your station team roster.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                  <label className="text-[10.5px] font-bold text-stone-400">Select Station Branch</label>
                  <select
                    value={supervisorExistingStationId}
                    onChange={(e) => setSupervisorExistingStationId(e.target.value)}
                    required
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Choose Registered Station --</option>
                    {stations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.stationCode}) - {st.companyName || 'Station'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Optional Staff ID */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-400">Staff ID (Optional)</label>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. SUP-001 (Optional)"
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-2xl p-2.5 text-xs text-white placeholder-stone-600 outline-hidden"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Firebase Verification...</span>
                </>
              ) : (
                <>
                  <span>Verify Contact &amp; Create Supervisor Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-stone-900 px-2 text-stone-500 font-bold">Or Instant Auth</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleGoogleAuth('supervisor')}
              className="w-full py-3 px-4 rounded-2xl bg-stone-950 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Continue with Google Account</span>
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: SIGN IN (ATTENDANT PIN LOGIN OR SUPERVISOR/STANDARD LOGIN) */}
        {/* ========================================================================= */}
        {mode === 'signin' && (
          <div className="space-y-4">
            {/* Sign In Method Selector Tabs */}
            <div className="grid grid-cols-2 p-1 bg-stone-950 rounded-2xl border border-stone-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setSignInTab('pin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  signInTab === 'pin'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-extrabold shadow-md shadow-emerald-950/40'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>Attendant PIN Access</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInTab('firebase');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  signInTab === 'firebase'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-extrabold shadow-md shadow-amber-950/40'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-stone-950" />
                <span>Supervisor / OTP</span>
              </button>
            </div>

            {/* TAB 1: ATTENDANT PIN LOGIN */}
            {signInTab === 'pin' && (
              <form onSubmit={handleAttendantPinLogin} className="space-y-4 animate-in fade-in">
                {pinLockoutSeconds > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg shadow-rose-950/40 animate-pulse">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white">Security Lockout Active</h4>
                      <p className="text-[11px] text-rose-300/90 mt-0.5 leading-relaxed">
                        Too many incorrect PIN attempts. Security lockout active for{' '}
                        <strong className="font-mono text-white text-xs bg-rose-900/60 px-1.5 py-0.5 rounded">
                          {Math.floor(pinLockoutSeconds / 60)}:
                          {(pinLockoutSeconds % 60).toString().padStart(2, '0')}
                        </strong>{' '}
                        before retry is permitted.
                      </p>
                    </div>
                  </div>
                )}

                {/* Attendant Staff ID */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Attendant Staff ID *
                    </span>
                    <span className="text-[9.5px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Full ID Required
                    </span>
                  </label>
                  <input
                    type="text"
                    value={attendantStaffIdInput}
                    onChange={(e) => setAttendantStaffIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. SO-ATT-101, SO-ATT-042"
                    required
                    className="w-full font-mono bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all uppercase font-bold tracking-wider"
                  />
                </div>

                {/* 6-Digit Personal PIN */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> 6-Digit Personal PIN *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_pin');
                        setForgotPinStep('request');
                        setForgotPinIdentifier(attendantStaffIdInput.trim());
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      Forgot / Reset PIN?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAttendantPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={attendantPinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setAttendantPinInput(val);
                      }}
                      placeholder="••••••"
                      required
                      disabled={pinLockoutSeconds > 0}
                      className="w-full font-mono bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-sm tracking-widest text-white placeholder-stone-600 outline-hidden transition-all pr-10 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAttendantPin(!showAttendantPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                    >
                      {showAttendantPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Enter the secret 6-digit PIN created during registration to unlock your shift on this device.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || pinLockoutSeconds > 0 || attendantPinInput.length !== 6}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying PIN...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Access Forecourt Console</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: SUPERVISOR / FIREBASE OTP / PASSWORD SIGN IN */}
            {signInTab === 'firebase' && (
              <form onSubmit={handleSignIn} className="space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-300">
                    Phone Number or Email Address *
                  </label>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. 024 123 4567 or manager@station.com"
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
                  />
                </div>

                {/* Sign in with Password toggle & Forgot Password trigger */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-stone-300 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loginWithPass}
                        onChange={(e) => setLoginWithPass(e.target.checked)}
                        className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>Sign in with Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setResetSentSuccess(false);
                        if (loginIdentifier.includes('@')) {
                          setResetEmail(loginIdentifier.trim());
                        }
                      }}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {loginWithPass && (
                    <div className="relative animate-in fade-in">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your account password"
                        required={loginWithPass}
                        className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>{loginWithPass ? 'Sign In to Dashboard' : 'Send Verification OTP'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-stone-900 px-2 text-stone-500 font-bold">Or Instant Sign In</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleGoogleAuth('supervisor')}
                  className="w-full py-3 px-4 rounded-2xl bg-stone-950 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>Sign In with Google</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 5: FORGOT / RESET PERSONAL PIN (OTP-BASED RECOVERY) */}
        {/* ========================================================================= */}
        {mode === 'forgot_pin' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-emerald-900/40 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="text-xs text-stone-400 space-y-1">
                <p className="font-bold text-white">Attendant PIN Recovery</p>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Reset your 6-digit Personal PIN by verifying a one-time passcode sent to your registered phone or email address.
                </p>
              </div>
            </div>

            {forgotPinStep === 'request' ? (
              <form onSubmit={handleRequestForgotPin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-300">
                    Attendant Staff ID, Phone, or Email *
                  </label>
                  <input
                    type="text"
                    value={forgotPinIdentifier}
                    onChange={(e) => setForgotPinIdentifier(e.target.value)}
                    placeholder="e.g. SO-ATT-101 or 024 123 4567"
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !forgotPinIdentifier.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Passcode...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-stone-400 hover:text-white font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetForgotPin} className="space-y-4 animate-in fade-in">
                {forgotPinTargetUser && (
                  <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{forgotPinTargetUser.fullName}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {forgotPinTargetUser.staffId || forgotPinTargetUser.identifier}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Code Sent
                    </span>
                  </div>
                )}

                {/* 6-Digit OTP */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-300">
                    6-Digit Verification Code (OTP) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotPinOtp}
                    onChange={(e) => setForgotPinOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP code"
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 font-mono text-sm tracking-widest text-center text-white placeholder-stone-600 outline-hidden transition-all"
                  />
                </div>

                {/* New PIN & Confirm New PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-stone-300">New 6-Digit PIN *</label>
                    <div className="relative">
                      <input
                        type={showForgotPinNew ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={6}
                        value={forgotPinNewPin}
                        onChange={(e) => setForgotPinNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="New PIN"
                        required
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl p-2.5 font-mono text-sm tracking-widest text-white placeholder-stone-600 outline-hidden pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPinNew(!showForgotPinNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                      >
                        {showForgotPinNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-stone-300">Confirm New PIN *</label>
                    <div className="relative">
                      <input
                        type={showForgotPinConfirm ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={6}
                        value={forgotPinConfirmPin}
                        onChange={(e) =>
                          setForgotPinConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="Confirm PIN"
                        required
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl p-2.5 font-mono text-sm tracking-widest text-white placeholder-stone-600 outline-hidden pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPinConfirm(!showForgotPinConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                      >
                        {showForgotPinConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    forgotPinOtp.length !== 6 ||
                    forgotPinNewPin.length !== 6 ||
                    forgotPinConfirmPin.length !== 6
                  }
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating PIN...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Reset PIN &amp; Sign In</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPinStep('request');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-stone-400 hover:text-white font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Change ID / Resend Code</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 4: FORGOT PASSWORD (FIREBASE AUTH PASSWORD RESET) */}
        {/* ========================================================================= */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="text-xs text-stone-400 space-y-1">
                <p className="font-bold text-white">Firebase Password Recovery</p>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Enter your registered email address. Firebase Authentication will dispatch a password recovery link to reset your account password.
                </p>
              </div>
            </div>

            {resetSentSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 space-y-3 text-center animate-in fade-in">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Reset Email Dispatched</h4>
                  <p className="text-xs text-stone-300 mt-1">
                    Password reset instructions have been dispatched to <strong className="text-emerald-400 font-mono">{resetEmail}</strong>.
                  </p>
                  <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
                    Please check your email inbox and spam/junk folder. Click the recovery link to set your new password, then proceed to sign in.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setLoginWithPass(true);
                      if (resetEmail) setLoginIdentifier(resetEmail);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setResetSentSuccess(false);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetSentSuccess(false)}
                    className="text-xs text-stone-400 hover:text-stone-200 py-1 cursor-pointer transition-colors"
                  >
                    Didn't receive it? Click here to try again or change email
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                    <span>Registered Account Email *</span>
                    <span className="text-[10px] text-stone-500">Firebase Auth</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="e.g. supervisor@station.com or attendant@station.com"
                      required
                      className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-3 pl-10 text-xs text-white placeholder-stone-600 outline-hidden transition-all"
                    />
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !resetEmail.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Password Reset Email...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setResetSentSuccess(false);
                }}
                className="text-xs text-stone-400 hover:text-white font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: OTP VERIFICATION VIEW */}
        {/* ========================================================================= */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {activeAuthType === 'phone' ? (
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Mail className="w-4 h-4 text-emerald-400" />
                )}
                <span className="font-mono text-white">
                  {activeAuthType === 'phone' ? formatPhoneNumber(activeIdentifier) : activeIdentifier}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* 6 Digits Boxes */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider text-center block">
                Enter 6-Digit Passcode
              </label>
              <div className="flex items-center justify-center gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-mono font-black bg-stone-950 border border-stone-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 rounded-xl text-white outline-hidden transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpDigits.join('').length !== 6}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Launch Console</span>
                </>
              )}
            </button>

            {/* Resend OTP & Help */}
            <div className="text-center pt-2 space-y-2">
              {resendCooldown > 0 ? (
                <p className="text-xs text-stone-500">
                  Resend code in <strong className="text-stone-300 font-mono">{resendCooldown}s</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 mx-auto cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Verification Code</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* Invisible Firebase reCAPTCHA container */}
        <div id="recaptcha-container" style={{ display: 'none' }}></div>
      </div>
    </div>
  );
};
