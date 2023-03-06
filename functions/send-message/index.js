const { CacheDictionaryGetField } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    const input = JSON.parse(event.body);

    const momento = await shared.getCacheClient(['chat', 'game', 'connection']);


    const username = await momento.get('connection', connectionId);
    const gameIdResponse = await momento.dictionaryGetField('user', username.valueString(), 'currentGameId');
    if (gameIdResponse instanceof CacheDictionaryGetField.Miss) {
      await shared.respondWs(connectionId, { message: 'You are not active in any game' });
      return { statusCode: 200 };
    }

    const gameId = gameIdResponse.valueString();
    const message = {
      type: 'new-message',
      username: username.valueString(),
      message: input.message,
      time: new Date().toISOString()
    }

    await Promise.all([
      await shared.broadcastMessage(momento, gameId, connectionId, message)
    ]);

    return { statusCode: 200 };
  } catch (err) {
    console.error(err);

    await shared.respondWs(connectionId, { message: 'Something went wrong' });
    return { statusCode: 200 };
  }
};