jest.mock("../lambda/repositories/taskRepository", () => ({
  getTasksByStatus: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  getTaskById: jest.fn(),
}));

const taskRepository = require("../lambda/repositories/taskRepository");
const taskService = require("../lambda/services/taskService");

describe("Task Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("debe traer tareas por usuario y done", async () => {
    taskRepository.getTasksByStatus.mockResolvedValue([
      {
        userId: "user-123",
        taskId: "task-1",
        title: "Aprender Jest",
        done: "DONE",
      },
    ]);

    const result = await taskService.getTasksByStatus("user-123", "DONE");

    expect(taskRepository.getTasksByStatus).toHaveBeenCalledWith(
      "user-123",
      "DONE"
    );

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Aprender Jest");
  });

  test("debe lanzar error para status inválido", async () => {
    await expect(
      taskService.getTasksByStatus("user-123", "INVALIDO")
    ).rejects.toThrow();
  });

  test("debe crear una tarea", async () => {
    const newTask = {
      userId: "user-123",
      title: "Aprender testing",
      done: "PENDING",
      status: "PENDING",
    };

    taskRepository.createTask.mockResolvedValue({
      taskId: "task-1",
      userId: "user-123",
      title: "Aprender testing",
      done: "PENDING",
      status: "PENDING",
    });

    const result = await taskService.createTask(newTask);

    expect(taskRepository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        title: "Aprender testing",
        done: "PENDING",
      })
    );

    const taskSentToRepository = taskRepository.createTask.mock.calls[0][0];

    expect(taskSentToRepository.taskId).toBeDefined();
    expect(taskSentToRepository.createdAt).toBeDefined();

    expect(result.taskId).toBe("task-1");
    expect(result.userId).toBe("user-123");
  });

  test("debe actualizar una tarea", async () => {
    taskRepository.getTaskById.mockResolvedValue({
      userId: "user-123",
      taskId: "task-1",
      title: "Tarea vieja",
      done: false,
    });

    taskRepository.updateTask.mockResolvedValue({
      userId: "user-123",
      taskId: "task-1",
      title: "Tarea actualizada",
      done: true,
    });

    const result = await taskService.updateTask("user-123", "task-1", {
      title: "Tarea actualizada",
      done: true,
    });

    expect(taskRepository.getTaskById).toHaveBeenCalledWith(
      "user-123",
      "task-1"
    );

    expect(taskRepository.updateTask).toHaveBeenCalledWith(
      "user-123",
      "task-1",
      expect.objectContaining({
        title: "Tarea actualizada",
        done: "DONE",
      })
    );

    expect(result.taskId).toBe("task-1");
    expect(result.done).toBe(true);
  });

  test("debe eliminar una tarea", async () => {
    taskRepository.getTaskById.mockResolvedValue({
      userId: "user-123",
      taskId: "task-1",
      title: "Tarea para eliminar",
    });

    taskRepository.deleteTask.mockResolvedValue({
      message: "Tarea eliminada correctamente",
    });

    const result = await taskService.deleteTask("user-123", "task-1");

    expect(taskRepository.getTaskById).toHaveBeenCalledWith(
      "user-123",
      "task-1"
    );

    expect(taskRepository.deleteTask).toHaveBeenCalledWith(
      "user-123",
      "task-1"
    );

    expect(result.message).toBe("Tarea eliminada correctamente");
  });
});