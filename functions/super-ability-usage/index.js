const { CacheDictionaryGetField } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const { username } = event.requestContext.authorizer.username;
    const momento = await shared.getCacheClient();

    const currentGameResponse = await momento.dictionaryGetField('user', username, 'currentGameId');
    if (currentGameResponse instanceof CacheDictionaryGetField.Miss) {
      return shared.buildResponse(409, { message: 'You are not part of an active game' });
    }
    const gameId = currentGameResponse.valueString();


    let value;
    switch (event.httpMethod.toLowerCase()) {
      case 'post':
        const body = JSON.parse(event.body);
        value = body.count;
        break
      case 'delete':
      default:
        value = -1;
    }

    const incrementResponse = await momento.increment('super-abilities', `${gameId}-${username}`, value);
    if (incrementResponse.value < 0) {
      return shared.buildResponse(409, { message: 'Out of super-ability uses' });
    } else {
      if (value < 0) {
        value = -.1
      } else {
        value = Number(`.${value}`)
      }

      await momento.sortedSetIncrementScore('leaderboard', gameId, username, value );
      return shared.buildResponse(200, { remaining: incrementResponse.value });
    }
  } catch (err) {
    console.error(err);
    return shared.buildResponse(500, { message: 'Something went wrong' });
  }
};