const { CacheDictionaryFetch } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    const input = JSON.parse(event.body);

    const momento = await shared.getCacheClient(['chat', 'game', 'connection']);
    const getGameResponse = await momento.dictionaryFetch('game', input.gameId);
    if (getGameResponse instanceof CacheDictionaryFetch.Miss) {
      await shared.respondWs(connectionId, { message: 'Game not found' });
      return { statusCode: 200 };
    }

    const username = await momento.get('connection', connectionId);
    const message = {
      type: 'new-message',
      username: username.valueString(),
      message: input.message,
      time: new Date().toISOString()
    }

    await Promise.all([
      await momento.listPushBack('chat', input.gameId, JSON.stringify(message)),
      await shared.broadcastMessage(momento, input.gameId, connectionId, message)
    ]);

    return { statusCode: 200 };
  } catch (err) {
    console.error(err);

    await shared.respondWs(connectionId, { message: 'Something went wrong' });
    return { statusCode: 200 };
  }
};