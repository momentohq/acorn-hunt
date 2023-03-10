const jwt = require('jsonwebtoken');
const shared = require('/opt/nodejs/index');

exports.MISSING_WEBSOCKET_PROTOCOL_HEADER_MESSAGE = 'The "Sec-Websocket-Protocol" header is missing';
exports.INVALID_SUBPROTOCOL_MESSAGE = 'The subprotocol must be "websocket" in order to establish a connection';
exports.MISSING_AUTH_TOKEN_MESSAGE = 'An auth token must be provided as the second value in the "Sec-Websocket-Protocol" header';
exports.SIGNATURE_NOT_CONFIGURED = 'Unable to validate auth token because a signature is not configured';

exports.handler = async (event, context) => {
  try {
    let authToken, protocol;
    // Websockets are strict on the headers they allow, so in our solution we provide the auth token 
    // in the sec-websocket-protocol header comma separated with the subprotocol
    // Example: sec-websocket-protocol: websocket, eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9==
    // Alternatively, the user could pass the auth token in a "token" query string parameter
    const websocketProtocolHeader = exports.getWebsocketProtocolHeader(event.headers);
    if (websocketProtocolHeader) {
      [protocol, authToken] = websocketProtocolHeader.split(',').map(section => section.trim());
      if (protocol?.toLowerCase() !== 'websocket') {
        throw new Error(exports.INVALID_SUBPROTOCOL_MESSAGE);
      }
    } else {
      if (!event?.queryStringParameters?.access_token) {
        throw new Error(exports.MISSING_AUTH_TOKEN_MESSAGE);
      }

      authToken = event.queryStringParameters.access_token;
    }

    const jwtData = await exports.verifyJwt(authToken);
    const policy = exports.getPolicy(event.methodArn, jwtData, protocol);

    return policy;
  } catch (err) {
    console.error(err, err.stack);
    context.fail('Unauthorized');
    return null;
  }
};

exports.getPolicy = (methodArn, jwtData, protocol) => {
  return {
    principalId: jwtData.userId,
    ...methodArn && {
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: methodArn
        }]
      }
    },
    context: exports.generateRequestContext(jwtData, protocol)
  };
};

exports.generateRequestContext = (jwtData, protocol) => {
  return {
    username: jwtData.username,
    ...jwtData.firstName && { firstName: jwtData.firstName },
    ...jwtData.lastName && { lastName: jwtData.lastName },
    ...protocol && { protocol: protocol}
  };
};

exports.verifyJwt = async (authToken) => {
  const signature = await shared.getSecret('signature');
  if (!signature) {
    throw new Error(exports.SIGNATURE_NOT_CONFIGURED);
  }

  const decodedJwt = await jwt.verify(authToken, signature);
  return decodedJwt?.data;
};

exports.getWebsocketProtocolHeader = (headers) => {
  const providedHeaderName = Object.keys(headers).find(h => h.toLowerCase() == 'sec-websocket-protocol');

  return headers[providedHeaderName];
};