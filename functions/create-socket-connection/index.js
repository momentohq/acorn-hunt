const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const momento = await shared.getCacheClient(['user', 'connection']);
    const username = event.requestContext.authorizer.username;

    await Promise.all([
      await momento.dictionarySetField('user', username, 'wsConnectionId', event.requestContext.connectionId),
      await momento.set('connection', event.requestContext.connectionId, username)
    ]);    

    return {
      statusCode: 200,
      headers: {
        'Sec-WebSocket-Protocol': 'websocket',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: shared.UNHANDLED_ERROR_MESSAGE })
    };
  }
};