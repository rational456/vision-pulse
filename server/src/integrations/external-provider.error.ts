export class ExternalProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly status: number | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ExternalProviderError';
  }
}
