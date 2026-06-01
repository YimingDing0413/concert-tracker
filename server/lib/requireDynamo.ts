import type { NextFunction, Request, Response } from 'express';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';

/** Guard for routes that require DynamoDB to be configured. */
export function requireDynamo(_req: Request, res: Response, next: NextFunction): void {
  if (!isDynamoConfigured()) {
    res.status(503).json({
      error:
        'DynamoDB is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and DYNAMODB_TABLE_NAME.',
    });
    return;
  }
  next();
}
