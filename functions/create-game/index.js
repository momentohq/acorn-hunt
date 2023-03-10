const { CollectionTtl } = require('@gomomento/sdk');
const ulid = require('ulid');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
    const id = ulid.ulid();
    const momento = await shared.getCacheClient(['game']);

    await Promise.all([
      await momento.dictionarySetFields('game', id, {
        duration: `${input.duration}`,
        name: input.name,
        ...input.mapId && { mapId: input.mapId },
        ...input.isRanked && { isRanked: `${input.isRanked}` }
      }, { ttl: CollectionTtl.of(input.duration) }),
      await momento.setAddElement('game', 'list', JSON.stringify({ id, name: input.name }))
    ]);

    return shared.buildResponse(201, { id });
  } catch (err) {
    console.error(err);
    return shared.buildResponse(500, { message: 'Something went wrong' });
  }
};