const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { CacheClient, EnvMomentoTokenProvider, Configurations, CacheSetFetch } = require('@gomomento/sdk');
const { Metrics } = require('@aws-lambda-powertools/metrics');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const apig = new ApiGatewayManagementApiClient({ endpoint: process.env.ENDPOINT });
const secrets = new SecretsManagerClient();
let cachedSecrets;
let momento;

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong';
exports.metrics = new Metrics({ namespace: 'acorn-hunt', serviceName: 'websocket' });

exports.getSecret = async (secretKey) => {
  if (cachedSecrets) {
    return cachedSecrets[secretKey];
  } else {
    const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
    if (secretResponse) {
      cachedSecrets = JSON.parse(secretResponse.SecretString);
      return cachedSecrets[secretKey];
    }
  }
};

exports.getCacheClient = async (caches) => {
  if (!momento) {
    const authToken = await exports.getSecret('momento');
    process.env.AUTH_TOKEN = authToken;
    const credentials = new EnvMomentoTokenProvider({ environmentVariableName: 'AUTH_TOKEN' });

    const cacheClient = new CacheClient({
      configuration: Configurations.Laptop.latest(),
      credentialProvider: credentials,
      defaultTtlSeconds: Number(process.env.CACHE_TTL)
    });
    momento = cacheClient;

    await initializeCaches(caches);
  }

  return momento;
};

exports.respondWs = async (connectionId, message) => {
  await apig.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify(message)
  }));
};

exports.broadcastMessage = async (momento, gameId, connectionIdToOmit, message) => {
  await momento.listPushBack('chat', gameId, JSON.stringify(message));

  const connectionResponse = await momento.setFetch('connection', gameId);
  if (connectionResponse instanceof CacheSetFetch.Hit) {
    const connections = connectionResponse.valueArray().filter(connection => connection != connectionIdToOmit);

    await Promise.allSettled(connections.map(async (connection) => {
      await apig.send(new PostToConnectionCommand({
        ConnectionId: connection,
        Data: JSON.stringify(message)
      }));
    }));
  } else {
    console.log(connectionResponse);
  }
};

exports.buildResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: { 'Access-Control-Allow-Origin': '*' },
    ...body && { body: JSON.stringify(body) }
  };
};

const initializeCaches = async (caches) => {
  if (caches?.length) {
    const listCachesResponse = await momento.listCaches();
    const cachesToAdd = caches.filter(c => !listCachesResponse.caches.some(cache => cache.name == c));
    for (const cacheToAdd of cachesToAdd) {
      await momento.createCache(cacheToAdd)
    }
  }
}