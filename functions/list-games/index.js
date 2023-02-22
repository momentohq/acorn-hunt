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

    return {
      statusCode: 200,
      body: JSON.stringify(gameList),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }
  catch (err) {
    console.err(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }
};