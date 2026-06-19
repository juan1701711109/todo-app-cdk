const taskService = require("./services/taskService");
const {
  SNSClient,
  PublishCommand,
} = require("@aws-sdk/client-sns");

const sns = new SNSClient({});

exports.handler = async (event) => {
  for (const record of event.Records) {
    const task = JSON.parse(record.body);

    await taskService.createTask(task);

    await sns.send(
        new PublishCommand({
            TopicArn: process.env.TOPIC_ARN,
            Message: JSON.stringify(task),
        })
    );
  }

  return {
    message: "Mensajes procesados correctamente",
  };
};