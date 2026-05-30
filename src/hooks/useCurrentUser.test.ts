import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCurrentUser } from './useCurrentUser';
import { jwtDecode } from 'jwt-decode';

// Mock jwt-decode
vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}));

describe('useCurrentUser hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null if there is no token in localStorage', () => {
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current.currentUser).toBeNull();
  });

  it('returns null if token is expired', () => {
    localStorage.setItem('token', 'fake-token');
    
    // Mock the date so we have a fixed now
    const now = 1600000000000;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    
    // exp is in seconds
    (jwtDecode as any).mockReturnValue({
      exp: (now / 1000) - 100 // expired 100 seconds ago
    });

    const { result } = renderHook(() => useCurrentUser());
    expect(result.current.currentUser).toBeNull();
  });

  it('parses valid token and returns user details', () => {
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('role', 'Admin');

    const now = 1600000000000;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));

    (jwtDecode as any).mockReturnValue({
      exp: (now / 1000) + 1000, // Valid for another 1000s
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": "42",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "john_doe"
    });

    const { result } = renderHook(() => useCurrentUser());
    
    expect(result.current.currentUser).toEqual({
      userId: 42,
      username: 'john_doe',
      role: 'Admin'
    });
  });

  it('falls back to "sub" claim and "Viewer" role if specifics are missing', () => {
    localStorage.setItem('token', 'valid-token');
    // Not setting 'role' in localStorage

    const now = 1600000000000;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));

    (jwtDecode as any).mockReturnValue({
      exp: (now / 1000) + 1000,
      sub: "84"
    });

    const { result } = renderHook(() => useCurrentUser());
    
    expect(result.current.currentUser).toEqual({
      userId: 84,
      username: 'Unknown',
      role: 'Viewer'
    });
  });

  it('returns null if jwtDecode throws an error (malformed token)', () => {
    localStorage.setItem('token', 'malformed-token');
    (jwtDecode as any).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const { result } = renderHook(() => useCurrentUser());
    expect(result.current.currentUser).toBeNull();
  });
});
