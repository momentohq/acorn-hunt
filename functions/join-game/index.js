const { CacheDictionaryFetch } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    const input = JSON.parse(event.body);

    const momento = await shared.getCacheClient(['game', 'connection', 'player', 'user']);
    const getGameResponse = await momento.dictionaryFetch('game', input.gameId);
    if (getGameResponse instanceof CacheDictionaryFetch.Miss) {
      await shared.respondWs(connectionId, { message: 'Game not found' });
      return { statusCode: 404 };
    }

    const username = await momento.get('connection', connectionId);

    await Promise.all([
      await momento.setAddElement('player', input.gameId, username.valueString()),
      //await momento.sortedSetAddElement('leaderboard', input.gameId, username.valueString(), 0),
      await momento.setAddElement('connection', input.gameId, connectionId),
      await momento.dictionarySetField('user', username.valueString(), 'currentGameId', input.gameId),
      await shared.broadcastMessage(momento, input.gameId, connectionId, {type: 'player-change', message: `${username.valueString()} joined the chat`, time: new Date().toISOString()})
    ]);

    const players = await momento.setFetch('player', input.gameId);
    await shared.respondWs(connectionId, { players: Array.from(players.valueSet()) });
    return { statusCode: 200 };
  } catch (err) {
    console.error(err);

    await shared.respondWs(connectionId, { message: 'Something went wrong' });
    return { statusCode: 500 };
  }
};
