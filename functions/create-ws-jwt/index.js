const jwt = require('jsonwebtoken');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try {
    let username = 'mo-the-squirrel';
    if (event.body) {
      const input = JSON.parse(event.body);
      if (input.username) {
        username = input.username
      }
    }
    const expiresInSeconds = (60 * 60);
    const tokenData = {
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      data: {
        username: username
      }
    }

    const signature = await shared.getSecret('signature');
    const token = jwt.sign(tokenData, signature);

    return {
      statusCode: 200,
      body: JSON.stringify({ authToken: token, expiresIn: expiresInSeconds }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  } catch (err) {
    console.error(err, err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }
};