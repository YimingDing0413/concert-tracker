/**
 * DynamoDB user accounts — server-side only.
 *
 * pk = USER#{userId}     sk = PROFILE
 * pk = EMAIL#{email}     sk = USER   → { userId }
 */
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { SignUpInput, User } from '../../../shared/types/index.js';
import { assertDynamoConfigured, getDocClient, getTableName } from './dynamodb.js';
import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs';

const EMAIL_PREFIX = 'EMAIL#';
const USER_PREFIX = 'USER#';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailPk(email: string): string {
  return `${EMAIL_PREFIX}${normalizeEmail(email)}`;
}

function userPk(userId: string): string {
  return `${USER_PREFIX}${userId}`;
}

function generateUserId(): string {
  return `user-${crypto.randomUUID().slice(0, 8)}`;
}

export type StoredUserProfile = User & { passwordHash: string };

export async function createUser(input: SignUpInput): Promise<User> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const email = normalizeEmail(input.email);

  const existing = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: emailPk(email), sk: 'USER' },
    })
  );
  if (existing.Item?.userId) {
    throw new Error('An account with this email already exists.');
  }

  const userId = generateUserId();
  const now = new Date().toISOString();
  const passwordHash = await bcryptHash(input.password, 10);

  const user: User = {
    id: userId,
    email: input.email.trim(),
    displayName: input.displayName.trim(),
    username: input.username.trim(),
    createdAt: now,
  };

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: userPk(userId),
        sk: 'PROFILE',
        entityType: 'USER_PROFILE',
        user,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: emailPk(email),
        sk: 'USER',
        entityType: 'EMAIL_INDEX',
        userId,
        email,
        createdAt: now,
      },
    })
  );

  return user;
}

export async function getUserByEmail(email: string): Promise<StoredUserProfile | null> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  const index = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: emailPk(email), sk: 'USER' },
    })
  );
  const userId = index.Item?.userId as string | undefined;
  if (!userId) return null;

  return getUserProfile(userId);
}

export async function getUserProfile(userId: string): Promise<StoredUserProfile | null> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  const res = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: userPk(userId), sk: 'PROFILE' },
    })
  );

  if (!res.Item) return null;

  const user = res.Item.user as User | undefined;
  const passwordHash = res.Item.passwordHash as string | undefined;
  if (!user || !passwordHash) return null;

  return { ...user, passwordHash };
}

export async function verifyLogin(
  email: string,
  password: string
): Promise<User | null> {
  const profile = await getUserByEmail(email);
  if (!profile) return null;

  const ok = await bcryptCompare(password, profile.passwordHash);
  if (!ok) return null;

  const { passwordHash: _hash, ...user } = profile;
  void _hash;
  return user;
}

export async function userExistsByEmail(email: string): Promise<boolean> {
  const profile = await getUserByEmail(email);
  return profile !== null;
}
