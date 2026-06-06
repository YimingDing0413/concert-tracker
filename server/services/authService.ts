import type { AuthSession, SignUpInput, User } from '../../shared/types/index.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { createUser, verifyLogin } from '../../src/lib/db/userRepository.js';
import { createAuthToken } from '../lib/authToken.js';
import { getCurrentUserFromRequest } from '../lib/getCurrentUser.js';
import * as store from '../storage/userStorage.js';
import type { Request } from 'express';

function withToken(user: User): AuthSession {
  return { user, token: createAuthToken(user.id) };
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  if (!input.email?.trim() || !input.password) {
    throw new Error('Email and password are required.');
  }
  if (input.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  if (isDynamoConfigured()) {
    const user = await createUser(input);
    return withToken(user);
  }

  const user = await store.signUp(input);
  return withToken(user);
}

export async function login(email: string, password: string): Promise<AuthSession> {
  if (!email?.trim()) {
    throw new Error('Email is required.');
  }

  if (isDynamoConfigured()) {
    const user = await verifyLogin(email, password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    return withToken(user);
  }

  const user = await store.login(email);
  if (password) {
    /* legacy file store: password not validated */
  }
  return withToken(user);
}

export async function getCurrentUser(req?: Request): Promise<User | null> {
  if (req) {
    const auth = await getCurrentUserFromRequest(req);
    if (!auth) return null;
    return {
      id: auth.userId,
      email: auth.email ?? '',
      displayName: auth.displayName,
      username: auth.username,
      avatarUrl: auth.avatarUrl,
      createdAt: '',
    };
  }
  return store.getCurrentUser();
}

export async function logout(): Promise<void> {
  await store.logout();
}
