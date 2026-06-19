const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

async function createTask(task) {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: task,
    })
  );

  return task;
}

async function getAllTasks(userId, limit, lastKey) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    Limit: limit,
  };

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  const result = await docClient.send(
    new QueryCommand(params)
  );

  return {
    items: result.Items,
    lastKey: result.LastEvaluatedKey,
  };
}

async function getTaskById(userId, taskId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        userId,
        taskId,
      },
    })
  );

  return result.Item;
}

async function getTasksByStatus(userId, doneValue) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "DoneIndex",
      KeyConditionExpression: "userId = :userId AND done = :done",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":done": doneValue,
      },
    })
  );

  return result.Items;
}

async function deleteTask(userId, taskId) {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        userId,
        taskId,
      },
    })
  );

  return taskId;
}

async function updateTask(userId, taskId, data) {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        userId,
        taskId,
      },
      UpdateExpression: "set title = :title, done = :done",
      ExpressionAttributeValues: {
        ":title": data.title,
        ":done": data.done,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes;
}

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  deleteTask,
  updateTask,
  getTasksByStatus,
};