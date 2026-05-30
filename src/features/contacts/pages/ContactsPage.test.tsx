// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ContactsPage from './ContactsPage';
import useContacts from '@/features/contacts/hooks/useContacts';

// Mock dependencies
vi.mock('@/hooks/useFlexiSchemaCSS', () => ({
  useFlexiSchemaCSS: vi.fn(),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/features/contacts/hooks/useContacts', () => ({
  default: vi.fn(),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }) => ({
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({
      index,
      size: 40,
      start: index * 40
    })),
    getTotalSize: () => count * 40,
  })
}));

describe('ContactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    useContacts.mockReturnValue({
      definitions: [],
      contacts: [],
      page: 1,
      totalCount: 0,
      setPage: vi.fn(),
      pageSize: 10,
      setPageSize: vi.fn(),
      loadContacts: vi.fn(),
      createContact: vi.fn(),
      saveContact: vi.fn(),
      loadDefinitions: vi.fn(),
      loading: false,
    });
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <ContactsPage userRole="Viewer" requireLogin={vi.fn()} />
      </MemoryRouter>
    );
    const rootDiv = document.querySelector('.fs-root');
    expect(rootDiv).toBeInTheDocument();
  });

  it('renders contacts from the hook', () => {
    useContacts.mockReturnValue({
      definitions: [],
      contacts: [
        { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
      ],
      page: 1,
      totalCount: 1,
      setPage: vi.fn(),
      pageSize: 10,
      setPageSize: vi.fn(),
      loadContacts: vi.fn(),
      createContact: vi.fn(),
      saveContact: vi.fn(),
      loadDefinitions: vi.fn(),
      loading: false,
    });

    render(
      <MemoryRouter>
        <ContactsPage userRole="Admin" requireLogin={vi.fn()} />
      </MemoryRouter>
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});

