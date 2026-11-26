import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export const auth: { currentUser: User | null } = {
  currentUser: null
};

export const db = new Proxy({} as Firestore, {
  get() { throw new Error('Cloud services are disabled in the portfolio demo.'); },
});

export const initAuth = (onAuthUserChanged: (user: any | null) => void) => {
  onAuthUserChanged(null);
  return () => {};
};

export const logout = async () => {};

export const emailSignIn = async (email: string, password: string): Promise<any> => {
  throw new Error('Auth disabled');
};

export const emailSignUp = async (email: string, password: string, displayName?: string): Promise<any> => {
  throw new Error('Auth disabled');
};

