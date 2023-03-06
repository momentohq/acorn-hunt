const { CacheDictionaryGetField } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;

    const momento = await shared.getCacheClient(['player', 'connection', 'user', 'chat']);
    const username = await momento.get('connection', connectionId);
    const gameIdResponse = await momento.dictionaryGetField('user', username.valueString(), 'currentGameId');
    if (gameIdResponse instanceof CacheDictionaryGetField.Miss) {
      return { statusCode: 200 };
    }

    const gameId = gameIdResponse.valueString();
    await Promise.all([
      await momento.setRemoveElement('player', gameId, username.valueString()),
      await momento.setRemoveElement('connection', gameId, connectionId),
      await momento.dictionaryRemoveField('user', username.valueString(), 'currentGameId', gameId),
      await shared.broadcastMessage(momento, gameId, connectionId, { type: 'player-changed', message: `${username.valueString()} left the chat`, time: new Date().toISOString() })
    ]);

    return { statusCode: 200 }
  } catch (err) {
    console.error(err);

    return { statusCode: 500 };
  }
};
