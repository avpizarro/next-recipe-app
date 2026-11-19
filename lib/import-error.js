export class ImportError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = 'ImportError';
    this.status = status;
  }
}
