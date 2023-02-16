const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const ddb = new DynamoDBClient();
const apig = new ApiGatewayManagementApiClient({ endpoint: process.env.ENDPOINT });

exports.handler = async (event, context, callback) => {
  try {
    await Promise.all(event.Records.map(async (record) => {
      const recordBody = JSON.parse(record.body);

      await exports.postMessageToSubscribedConnections(recordBody.detail);
    }));
  } catch (err) {
    console.error(err);
    callback(err);
  }
};

exports.postMessageToSubscribedConnections = async (detail) => {
  const connections = await exports.getSubscribedConnections(detail);
  if (!connections?.length)
    return;

  await Promise.all(connections.map(async (connection) => {
    const command = exports.buildPostToConnectionCommand(connection.pk.S, detail.entityId, detail.message);
    await apig.send(command);
  }));
};

exports.getSubscribedConnections = async (request) => {
  const command = exports.buildQueryCommand(request);
  const response = await ddb.send(command);
  if (response?.Items?.length) {
    return response.Items;
  }
};

exports.buildQueryCommand = (request) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    IndexName: process.env.INDEX_NAME,
    KeyConditionExpression: '#GSI1PK = :GSI1PK and #GSI1SK = :GSI1SK',
    ExpressionAttributeNames: {
      '#GSI1PK': 'GSI1PK',
      '#GSI1SK': 'GSI1SK'
    },
    ExpressionAttributeValues: marshall({
      ':GSI1PK': request.entityId,
      ':GSI1SK': 'subscription#'
    })
  };

  return new QueryCommand(params);
};

exports.buildPostToConnectionCommand = (connectionId, entityId, message) => {
  const params = {
    ConnectionId: connectionId,
    Data: JSON.stringify({
      type: 'Entity Updated',
      entityId: entityId,
      ...message && { message }
    })
  };

  return new PostToConnectionCommand(params);
};