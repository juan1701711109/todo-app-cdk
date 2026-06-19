const taskRepository = require("../repositories/taskRepository");
const ValidationError = require("../errors/ValidationError");
const NotFoundError = require("../errors/NotFoundError");

async function createTask(data) {
  if (!data) {
    throw new ValidationError("El body es obligatorio");
  }

  if (!data.title || data.title.trim() === "") {
    throw new ValidationError("El título es obligatorio");
  }

  if (!data.userId) {
    throw new Error("userId es obligatorio para crear la tarea");
  }

  const task = {
    userId: data.userId,
    email: data.email,
    taskId: Date.now().toString(),
    title: data.title,
    done: data.done === true ? "DONE" : "PENDING",
    createdAt: new Date().toISOString(),
  };

  return await taskRepository.createTask(task);
}

async function getAllTasks(userId, limit, lastKey) {
  if (!userId) {
    throw new Error("userId es obligatorio");
  }

  return await taskRepository.getAllTasks(
    userId,
    limit,
    lastKey
  );
}

async function getTaskById(userId, taskId) {
  if (!userId) {
    throw new Error("userId es obligatorio");
  }

  const task = await taskRepository.getTaskById(userId, taskId);

  if (!task) {
    throw new NotFoundError("La tarea no existe");
  }

  return task;
}

async function getTasksByStatus(userId, status) {
  if (status !== "DONE" && status !== "PENDING") {
    throw new ValidationError("El status debe ser DONE o PENDING");
  }

  return await taskRepository.getTasksByStatus(userId, status);
}

async function deleteTask(userId, taskId) {
  if (!userId) {
    throw new Error("userId es obligatorio");
  }

  const task = await taskRepository.getTaskById(userId, taskId);

  if (!task) {
    throw new NotFoundError("No se puede eliminar porque la tarea no existe");
  }

  return await taskRepository.deleteTask(userId, taskId);
}

async function updateTask(userId, taskId, data) {
  if (!userId) {
    throw new Error("userId es obligatorio");
  }

  if (!data) {
    throw new ValidationError("El body es obligatorio");
  }

  if (!data.title || data.title.trim() === "") {
    throw new ValidationError("El título es obligatorio");
  }

  if (typeof data.done !== "boolean") {
    throw new ValidationError("El campo done debe ser true o false");
  }

  const doneStatus = data.done === true ? "DONE" : "PENDING";

  const task = await taskRepository.getTaskById(userId, taskId);

  if (!task) {
    throw new NotFoundError("No se puede actualizar porque la tarea no existe");
  }

  return await taskRepository.updateTask(userId, taskId, {
    title: data.title,
    done: doneStatus,
  });
}

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  deleteTask,
  updateTask,
  getTasksByStatus,
};