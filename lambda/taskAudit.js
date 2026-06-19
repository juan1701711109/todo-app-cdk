const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

exports.handler = async (event) => {
  for (const record of event.Records) {
    const snsMessage = JSON.parse(record.Sns.Message);

    const auditEvent = {
      eventId: crypto.randomUUID(),
      eventType: snsMessage.eventType || "UNKNOWN_EVENT",
      timestamp: new Date().toISOString(),
      payload: snsMessage,
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: auditEvent,
      })
    );

    console.log("Evento de auditoría guardado:", auditEvent);
  }

  return {
    message: "Auditoría guardada correctamente",
  };
};