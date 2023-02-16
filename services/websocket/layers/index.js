const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { SimpleCacheClient, EnvMomentoTokenProvider, Configurations } = require('@gomomento/sdk');
const { Metrics } = require('@aws-lambda-powertools/metrics');

const secrets = new SecretsManagerClient();
let cachedSecrets;
let momento;

exports.CACHE_NAME = 'demo';
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

    const cacheClient = new SimpleCacheClient({
      configuration: Configurations.Laptop.latest(),
      credentialProvider: credentials,
      defaultTtlSeconds: Number(process.env.CACHE_TTL)
    });
    momento = cacheClient;

    await initializeCaches(caches);
  }
  
  return momento;
};

const initializeCaches = async (caches) => {
  if(caches?.length){
    const listCachesResponse = await momento.listCaches();
    const cachesToAdd = caches.filter(c => !listCachesResponse.caches.some(cache => cache.name == c));
    for(const cacheToAdd of cachesToAdd){
      await momento.createCache(cacheToAdd)
    }
  }
}