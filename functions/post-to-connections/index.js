const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const shared = require('/opt/nodejs/index');

const apig = new ApiGatewayManagementApiClient({ endpoint: process.env.ENDPOINT });

exports.handler = async (event) => {
  const { connections, message, saveToChatHistory, gameId } = event.detail;

  if(saveToChatHistory){
    const momento = await shared.getCacheClient(['chat']);    
    await momento.listPushBack('chat', gameId, JSON.stringify(message));
  }

  const results = await Promise.allSettled(connections.map(async (connection) => {
    await apig.send(new PostToConnectionCommand({
      ConnectionId: connection,
      Data: JSON.stringify(message)
    }));
  }));

  const failedPosts = results.filter(result => result.status == 'rejected');
  for (const failedPost of failedPosts) {
    console.error({ error: 'FailedToPostToConnection', message: failedPost.reason });
  }
};