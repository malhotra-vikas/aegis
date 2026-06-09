import 'reflect-metadata';
import { type ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function mockHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));

  it('passes through an HttpException status and message', () => {
    const { host, json, status } = mockHost();
    new AllExceptionsFilter().catch(new BadRequestException('bad input'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ statusCode: 400, error: expect.stringContaining('bad input') });
  });

  it('maps an unknown error to a generic 500 and never leaks detail', () => {
    const { host, json, status } = mockHost();
    new AllExceptionsFilter().catch(new Error('secret-token detail that must not escape'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ statusCode: 500, error: 'Internal server error' });
    expect(JSON.stringify(json.mock.calls[0]![0])).not.toContain('secret-token');
  });
});
