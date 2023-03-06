const { CacheDictionaryGetField } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const momento = await shared.getCacheClient(['user', 'connection', 'player']);

    const username = await momento.get('connection', connectionId);
    const gameIdResponse = await momento.dictionaryGetField('user', username.valueString(), 'currentGameId');

    if (gameIdResponse instanceof CacheDictionaryGetField.Hit) {
      const gameId = gameIdResponse.valueString();
      await Promise.all([
        await momento.setRemoveElement('player', gameId, username.valueString()),
        await momento.dictionaryRemoveField('user', username.valueString(), 'currentGameId', gameId),
        await momento.setRemoveElement('connection', gameId, connectionId),
        await shared.broadcastMessage(momento, gameId, connectionId, { type: 'player-changed', message: `${username.valueString()} left the chat`, time: new Date().toISOString() })
      ]);
    }

    await momento.delete('connection', connectionId);

    return { statusCode: 204 };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: shared.UNHANDLED_ERROR_MESSAGE })
    };
  }
};