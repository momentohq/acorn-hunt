const { CacheSortedSetFetch, SortedSetOrder } = require('@gomomento/sdk');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const { gameId } = event.pathParameters;
    const params = event.queryStringParameters;

    const order = params?.order?.toLowerCase() == 'asc' ? SortedSetOrder.Ascending : SortedSetOrder.Descending;
    const top = params?.top;

    const momento = await shared.getCacheClient(['leaderboard']);
    const leaderboardResponse = await momento.sortedSetFetchByRank('leaderboard', gameId, {
      order: order,
      ...top && {
        startRank: 0,
        endRank: top
      }
    });

    if (leaderboardResponse instanceof CacheSortedSetFetch.Miss) {
      return shared.buildResponse(404, { message: 'Game not found' });
    }

    const leaderboard = leaderboardResponse.valueArray().map((element, rank) => {
      return {
        rank: rank + 1,
        username: element.value,
        score: Math.floor(element.score)
      }
    });

    return shared.buildResponse(200, { leaderboard });
  } catch (err) {
    console.error(err);
    return shared.buildResponse(500, { message: 'Something went wrong' });
  }
};