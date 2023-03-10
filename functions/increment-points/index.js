const { CacheDictionaryGetField } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
    const { username } = event.requestContext.authorizer;

    const momento = await shared.getCacheClient(['user', 'leaderboard']);
    const currentGameResponse = await momento.dictionaryGetField('user', username, 'currentGameId');
    if (currentGameResponse instanceof CacheDictionaryGetField.Miss) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'You are not part of an active game' })
      };
    }

    const gameId = currentGameResponse.valueString();
    const newScore = await momento.sortedSetIncrementScore('leaderboard', gameId, username, input.count);

    return shared.buildResponse(200, { score: newScore.score() });
  } catch (err) {
    console.error(err);
    return shared.buildResponse(500, { message: 'Something went wrong' });
  }
};