const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const input = JSON.parse(event.body);

    const momento = await shared.getCacheClient(['player', 'connection', 'user']);
    const username = await momento.get('connection', connectionId);

    await Promise.all([
      await momento.setRemoveElement('player', input.gameId, username.valueString()),
      await momento.setRemoveElement('connection', input.gameId, connectionId),
      await momento.dictionaryRemoveField('user', username.valueString(), 'currentGameId', input.gameId),
      await shared.broadcastMessage(momento, input.gameId, connectionId, { type: 'player-changed', message: `${username.valueString()} left the chat`, time: new Date().toISOString() })
    ]);

    return { statusCode: 200 }
  } catch (err) {
    console.error(err);

    return { statusCode: 500 };
  }
};
