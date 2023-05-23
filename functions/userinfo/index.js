const { AuthClient, CacheGet, CredentialProvider, AllDataReadWrite, ExpiresIn, GenerateAuthToken } = require('@gomomento/sdk');
const MongoClient = require('mongodb').MongoClient;
const shared = require('/opt/nodejs/index');

let cachedDb = null;

exports.handler = async (event) => {
  try {
    const ipAddress = event.requestContext.identity.sourceIp;

    const db = await connectToDatabase();
    let user;
    try{
      user = await db.collection('users').findOne({ ip: ipAddress });
    } catch(err){
      console.warn(err);
    }

    const userinfo = await formatUserInfo(user, event.requestContext.authorizer);

    return {
      statusCode: 200,
      body: JSON.stringify(userinfo),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };

  }
};

async function formatUserInfo(user, authorizerDetails) {
  const userInfo = {
    username: user?.username ?? authorizerDetails?.username,
    firstName: user?.firstName,
    lastName: user?.lastName,
    level: user.level ?? 1,
    claims: await getClaims(user.ip)
  }

  return userInfo;
};

async function getClaims(ip) {
  let claims = {};
  const cacheClient = await shared.getCacheClient();
  const response = await cacheClient.get('user', `${ip}-claims`);
  if (response instanceof CacheGet.Hit) {
    claims.momento = JSON.parse(response.valueString());
  } else {
    const momentoAuthToken = await shared.getSecret('momento');
    const authClient = new AuthClient({credentialProvider: CredentialProvider.fromString({ authToken: momentoAuthToken})});

    // 1 hour from now in epoch
    const token = await authClient.generateAuthToken(AllDataReadWrite, ExpiresIn.seconds(3600));
    if(token instanceof GenerateAuthToken.Success){
      claims.momento = {
        token: token.authToken,
        exp: token.expiresAt.epoch
      };
  
      await cacheClient.set('user', `${ip}-claims`, JSON.stringify(claims.momento), { ttl: 3600 });
    }
    
  }
  return claims;
};

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const connectionString = await shared.getSecret('mongodb');

  const client = await MongoClient.connect(connectionString);
  const db = client.db();
  cachedDb = db;
  return db;
}
