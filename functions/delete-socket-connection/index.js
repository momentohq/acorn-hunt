const { CacheDictionaryGetField } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const cacheClient = await shared.getCacheClient();

    const username = await cacheClient.get('connection', connectionId);
    const gameIdResponse = await cacheClient.dictionaryGetField('user', username.valueString(), 'currentGameId');

    if (gameIdResponse instanceof CacheDictionaryGetField.Hit) {
      const gameId = gameIdResponse.valueString();
      
      const gameTileResponse = await cacheClient.dictionaryFetch('game', `${gameId}-tiles`);
      const gameTilesToRemove = [];
      for (const [key, value] of Object.entries(gameTileResponse.valueRecord())) {
        const tile = JSON.parse(value);
        if (tile.username == username) {
          gameTilesToRemove.push(key);
        }
      }

      await Promise.all([
        await cacheClient.setRemoveElement('player', gameId, username.valueString()),
        await cacheClient.dictionaryRemoveFields('user', username.valueString(), ['currentGameId', 'x', 'y', 'avatar']),
        await cacheClient.dictionaryRemoveFields('game', `${gameId}-tiles`, gameTilesToRemove),
        await cacheClient.setRemoveElement('connection', gameId, connectionId),
        await shared.broadcastMessage(cacheClient, gameId, connectionId, { type: 'player-left', username: username.valueString(), message: `${username.valueString()} left the chat`, time: new Date().toISOString() })
      ]);
    }

    await cacheClient.delete('connection', connectionId);

    return { statusCode: 204 };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: shared.UNHANDLED_ERROR_MESSAGE })
    };
  }
};