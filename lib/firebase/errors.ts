export type AuthFlow = 'signin' | 'signup';

export function mapFirebaseAuthErrorToI18nKey(flow: AuthFlow, code?: string): string {
  if (flow === 'signin') {
    // Generic message for credential issues, don't leak existence
    return 'errors.signInGeneric';
  }
  // Sign-up: specific messages
  switch (code) {
    case 'auth/email-already-in-use':
      return 'errors.emailInUse';
    case 'auth/invalid-email':
      return 'errors.email';
    case 'auth/weak-password':
      return 'errors.passwordLength';
    default:
      return 'errors.firebaseGeneric';
  }
}
