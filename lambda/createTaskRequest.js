const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqs = new SQSClient({});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const claims = event.requestContext?.authorizer?.claims;

    console.log("CLAIMS:", JSON.stringify(claims));

    const userId = claims?.sub;
    const email = claims?.email;

    if (!body.title) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "El title es obligatorio",
        }),
      };
    }

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Usuario no autenticado",
        }),
      };
    }

    const message = {
      title: body.title,
      description: body.description || "",
      status: "PENDING",
      userId,
      email,
    };

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.TASKS_QUEUE_URL,
        MessageBody: JSON.stringify(message),
      })
    );

    return {
      statusCode: 202,
      body: JSON.stringify({
        message: "Tarea recibida y enviada a la cola",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error enviando tarea a SQS",
        error: error.message,
      }),
    };
  }
};