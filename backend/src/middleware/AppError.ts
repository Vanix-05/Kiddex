// An error we expect and can explain to a Teacher. The error handler turns it into
// { error: { code, message } } with the right HTTP status.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
