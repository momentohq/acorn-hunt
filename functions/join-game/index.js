const { CacheDictionaryFetch, CacheSortedSetGetScore } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    const input = JSON.parse(event.body);

    const momento = await shared.getCacheClient(['game', 'connection', 'player', 'user', 'chat']);
    const getGameResponse = await momento.dictionaryFetch('game', input.gameId);
    if (getGameResponse instanceof CacheDictionaryFetch.Miss) {
      await shared.respondWs(connectionId, { message: 'Game not found' });
      return { statusCode: 404 };
    }

    const cachedUsername = await momento.get('connection', connectionId);
    const username = cachedUsername.valueString();

    await Promise.all([
      await momento.setAddElement('player', input.gameId, username),
      await initializeLeaderboardScore(momento, input.gameId, username),
      await momento.setAddElement('connection', input.gameId, connectionId),
      await momento.dictionarySetField('user', username, 'currentGameId', input.gameId),
      await shared.broadcastMessage(momento, input.gameId, connectionId, { type: 'player-change', message: `${username} joined the chat`, time: new Date().toISOString() })
    ]);



    const messages = await momento.listFetch('chat', input.gameId);
    const players = await momento.setFetch('player', input.gameId);

    const connectionResponse = {
      type: 'game-joined',
      name: getGameResponse.valueRecord().name,
      username: username,
      players: Array.from(players.valueSet()),
      messages: messages.valueListString().map(m => JSON.parse(m))
    };

    await shared.respondWs(connectionId, connectionResponse);
    return { statusCode: 200 };
  } catch (err) {
    console.error(err);

    await shared.respondWs(connectionId, { message: 'Something went wrong' });
    return { statusCode: 500 };
  }
};

const initializeLeaderboardScore = async (momento, gameId, username) => {
  const existingScore = await momento.sortedSetGetScore('leaderboard', gameId, username);
  if (existingScore instanceof CacheSortedSetGetScore.Miss) {
    await momento.sortedSetPutElement('leaderboard', gameId, username, 0.3);
  }
};