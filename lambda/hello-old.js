const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { 
    DynamoDBDocumentClient,
    PutCommand,
    ScanCommand, 
    DeleteCommand,
    GetCommand,
    UpdateCommand
 } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    // Get
    if (method === "GET" && event.pathParameters?.id) {
        const id = event.pathParameters.id;

        const result = await docClient.send(
            new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id }
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(result.Item)
        };
    }

    if (method === "GET") {
        const result = await docClient.send(
            new ScanCommand({
            TableName: process.env.TABLE_NAME
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(result.Items)
        };
    }

    // Delete
    if (method === "DELETE") {
        const id = event.pathParameters.id;

        await docClient.send(
            new DeleteCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id }
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
            message: "Tarea eliminada",
            id
            })
        };
    }

    // Put
    if (method === "PUT" && event.pathParameters?.id) {
        const id = event.pathParameters.id;
        const body = JSON.parse(event.body);

        const result = await docClient.send(
            new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id },
            UpdateExpression: "set title = :title, done = :done",
            ExpressionAttributeValues: {
                ":title": body.title,
                ":done": body.done
            },
            ReturnValues: "ALL_NEW"
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
            message: "Tarea actualizada",
            task: result.Attributes
            })
        };
    }

    // Post
    const body = JSON.parse(event.body);

    const task = {
        id: Date.now().toString(),
        title: body.title,
        done: body.done ?? false
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: task
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tarea guardada",
        task
      })
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};