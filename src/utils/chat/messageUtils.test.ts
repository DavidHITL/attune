
import { normalizeMessageRole, ensureValidMessageRole } from './messageUtils';
import { Message } from '../types';

describe('Message Role Utilities', () => {
  test('normalizeMessageRole handles valid roles', () => {
    expect(normalizeMessageRole('user')).toBe('user');
    expect(normalizeMessageRole('assistant')).toBe('assistant');
  });

  test('normalizeMessageRole defaults to user', () => {
    expect(normalizeMessageRole(undefined)).toBe('user');
    expect(normalizeMessageRole('invalid')).toBe('user');
  });

  test('ensureValidMessageRole sets default values', () => {
    const message = ensureValidMessageRole({ content: 'Test' });
    expect(message.role).toBe('user');
    expect(message.content).toBe('Test');
    expect(message.id).toMatch(/temp-\d+/);
    expect(message.created_at).toBeTruthy();
  });
});
