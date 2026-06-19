const taskService = require("./services/taskService");
const { success, error } = require("./utils/response");

const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const sns = new SNSClient({});

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    const id = event.pathParameters?.id;

    const claims = event.requestContext?.authorizer?.claims;
    const userId = claims?.sub;

    if (method === "GET" && id) {
      const task = await taskService.getTaskById(userId,id);

      return success(200, task);
    }

    if (method === "GET") {
        const status = event.queryStringParameters?.status;

        if (status) {
            const tasks = await taskService.getTasksByStatus(userId, status);

            return success(200, tasks);
        }

        const limit = Number(event.queryStringParameters?.limit ?? 5);

        const lastKeyParam = event.queryStringParameters?.lastKey;

        const lastKey = lastKeyParam
            ? JSON.parse(decodeURIComponent(lastKeyParam))
            : undefined;

        const result = await taskService.getAllTasks(userId, limit, lastKey);

        const nextLastKey =
          result.items.length > 0 && result.lastKey
            ? encodeURIComponent(JSON.stringify(result.lastKey))
            : null;

        return success(200, {
            items: result.items,
            lastKey: nextLastKey
        });
    }

   if (method === "DELETE" && id) {
      await taskService.deleteTask(userId, id);

      await sns.send(
        new PublishCommand({
          TopicArn: process.env.TASK_CREATED_TOPIC_ARN,
          Message: JSON.stringify({
            eventType: "TASK_DELETED",
            payload: {
              userId,
              taskId: id,
            },
          }),
        })
      );

      return success(200, {
        message: "Tarea eliminada",
        id,
      });
    }

    if (method === "PUT" && id) {
      const body = JSON.parse(event.body || "{}");

      const task = await taskService.updateTask(userId, id, body);

      await sns.send(
        new PublishCommand({
          TopicArn: process.env.TASK_CREATED_TOPIC_ARN,
          Message: JSON.stringify({
            eventType: "TASK_UPDATED",
            payload: task,
          }),
        })
      );

      return success(200, {
        message: "Tarea actualizada",
        task,
      });
    }

    if (method === "POST") {
      const body = JSON.parse(event.body);

      const task = await taskService.createTask(body);

      return success(200, {
        message: "Tarea guardada",
        task,
      });
    }

    return error(404, "Ruta no encontrada");
  } catch (err) {
    console.error(err);

    if (err.statusCode) {
    return error(err.statusCode, err.message);
    }

    return error(500, "Error interno del servidor");
  }
};