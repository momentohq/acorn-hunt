const shared = require('/opt/nodejs/index');
const { CacheSetFetch } = require('@gomomento/sdk');

exports.handler = async (event) => {
  try {
    const momento = await shared.getCacheClient(['game']);

    let gameList = [];
    const games = await momento.setFetch('game', 'list');
    if (games instanceof CacheSetFetch.Hit) {
      gameList = games.valueArray().map(g => JSON.parse(g));
    }

    return shared.buildResponse(200, gameList);
  }
  catch (err) {
    console.err(err);
    return shared.buildResponse(500, { message: 'Something went wrong'});
  }
};