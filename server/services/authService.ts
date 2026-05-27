import type { SignUpInput, User } from '../../shared/types/index.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { createUser, verifyLogin } from '../../src/lib/db/userRepository.js';
import * as store from '../storage/userStorage.js';

export async function signUp(input: SignUpInput): Promise<User> {
  if (!input.email?.trim() || !input.password) {
    throw new Error('Email and password are required.');
  }
  if (input.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  if (isDynamoConfigured()) {
    return createUser(input);
  }

  return store.signUp(input);
}

export async function login(email: string, password: string): Promise<User> {
  if (!email?.trim()) {
    throw new Error('Email is required.');
  }

  if (isDynamoConfigured()) {
    const user = await verifyLogin(email, password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    return user;
  }

  const user = await store.login(email);
  if (password) {
    /* legacy file store: password not validated */
  }
  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  return store.getCurrentUser();
}

export async function logout(): Promise<void> {
  await store.logout();
}
