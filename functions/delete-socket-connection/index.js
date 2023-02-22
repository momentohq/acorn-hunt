const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const momento = await shared.getCacheClient(['user', 'connection', 'player']);

    const username = await momento.get('connection', connectionId);

    await Promise.all([
      await momento.setRemoveElement('player', input.gameId, username.valueString()),
      await momento.setRemoveElement('connection', input.gameId, connectionId),
      await momento.dictionaryRemoveField('user', username.valueString(), 'currentGameId', gameId),
      await momento.delete('connection', connectionId)
    ])

    return { statusCode: 204 };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: shared.UNHANDLED_ERROR_MESSAGE })
    };
  }
};