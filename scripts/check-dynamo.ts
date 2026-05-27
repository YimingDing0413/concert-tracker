import '../server/env.js';
import { checkDynamoHealth } from '../server/lib/dynamoHealth.js';
import { isDynamoConfigured } from '../src/lib/db/dynamodb.js';

async function main() {
  console.log('dynamodbConfigured:', isDynamoConfigured());
  const result = await checkDynamoHealth();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
