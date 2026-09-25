import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TemplatesPage from './templates';
import {
  fetchTemplateTags,
  saveTemplateOrder,
  saveTemplateTags,
} from '../services/templateTagService';

const mockShowAlert = jest.fn();
const mockUpdates: Array<Record<string, unknown>> = [];
let mockTemplateRows: any[] = [];
let mockArchivedColumnMissing = false;

function mockMakeQuery() {
  let selectedColumns = '';
  const query: any = {
    select: jest.fn((columns: string) => {
      selectedColumns = columns;
      return query;
    }),
    update: jest.fn((values: Record<string, unknown>) => {
      mockUpdates.push(values);
      return query;
    }),
    delete: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() =>
      Promise.resolve(
        mockArchivedColumnMissing && selectedColumns.includes('archived_at')
          ? {
              data: null,
              error: {
                code: '42703',
                message: 'column templates.archived_at does not exist',
              },
            }
          : { data: mockTemplateRows, error: null }
      )
    ),
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve, reject),
  };
  return query;
}

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock('../supabase/client', () => ({
  supabase: { from: () => mockMakeQuery() },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'user-1', loading: false }),
}));

jest.mock('../context/SystemAlertContext', () => ({
  useSystemAlerts: () => ({ showAlert: mockShowAlert }),
}));

jest.mock('../services/templateTagService', () => ({
  createTemplateTag: jest.fn(),
  fetchTemplateTags: jest.fn(),
  saveTemplateOrder: jest.fn(),
  saveTemplateTags: jest.fn(),
}));

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/ResponsiveSegmentedControl', () => ({
  ResponsiveSegmentedControl: ({ options, value, onChange }: any) => (
    <div>
      {options.map((option: any) => (
        <button
          aria-pressed={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

const row = (id: string, name: string, archived_at: string | null, sort_order = 0, tags: any[] = []) => ({
  id,
  name,
  archived_at,
  sort_order,
  template_tag_links: tags.map(tag => ({ tag })),
  template_exercises: [],
});

const renderPage = () => render(<TemplatesPage />);

describe('TemplatesPage', () => {
  beforeEach(() => {
    mockTemplateRows = [];
    mockArchivedColumnMissing = false;
    mockUpdates.length = 0;
    mockShowAlert.mockClear();
    (fetchTemplateTags as jest.Mock).mockResolvedValue({ data: [], error: null });
    (saveTemplateOrder as jest.Mock).mockResolvedValue({ data: true, error: null });
    (saveTemplateTags as jest.Mock).mockResolvedValue({ data: true, error: null });
  });

  it('searches active templates and hides the segments when nothing is archived', async () => {
    mockTemplateRows = [
      row('one', 'Lower body', null),
      row('two', 'Upper body', null),
    ];
    renderPage();

    expect(await screen.findByText('Lower body')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archived Templates' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search templates' }), {
      target: { value: 'upper' },
    });

    expect(screen.queryByText('Lower body')).not.toBeInTheDocument();
    expect(screen.getByText('Upper body')).toBeInTheDocument();
  });

  it('switches between active and archived actions and restores a template', async () => {
    mockTemplateRows = [
      row('active', 'Active plan', null),
      row('archived', 'Old plan', '2026-09-01T00:00:00.000Z'),
    ];
    renderPage();

    expect(await screen.findByText('Active plan')).toBeInTheDocument();
    expect(screen.queryByText('Old plan')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Archived Templates' }));

    expect(await screen.findByText('Old plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'De-archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'De-archive' }));

    await waitFor(() => expect(mockUpdates).toContainEqual({ archived_at: null }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Archived Templates' })).not.toBeInTheDocument()
    );
    expect(await screen.findByText('Old plan')).toBeInTheDocument();
  });

  it('archives active templates instead of deleting them', async () => {
    mockTemplateRows = [row('active', 'Active plan', null)];
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));

    await waitFor(() =>
      expect(mockUpdates.some(update => typeof update.archived_at === 'string')).toBe(true)
    );
    await waitFor(() => expect(screen.queryByText('Active plan')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Archived Templates' })).toBeInTheDocument();
  });

  it('loads active templates safely when the archive migration is still pending', async () => {
    mockArchivedColumnMissing = true;
    mockTemplateRows = [row('active', 'Existing plan', null)];
    renderPage();

    expect(await screen.findByText('Existing plan')).toBeInTheDocument();
    expect(
      screen.getByText(/Template archiving will be available after the pending database update/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('reorders active templates and persists the full active order', async () => {
    mockTemplateRows = [
      row('one', 'Lower body', null, 1024),
      row('two', 'Upper body', null, 2048),
    ];
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Reorder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Lower body down' }));

    await waitFor(() => expect(saveTemplateOrder).toHaveBeenCalledWith(['two', 'one']));
    expect(screen.getByRole('button', { name: 'Move Upper body up' })).toBeDisabled();
  });

  it('saves tag assignments from the template drawer', async () => {
    const pushTag = { id: 'tag-1', name: 'Push' };
    mockTemplateRows = [row('one', 'Push day', null, 1024, [pushTag])];
    (fetchTemplateTags as jest.Mock).mockResolvedValue({ data: [pushTag], error: null });
    renderPage();

    expect(await screen.findByText('Push')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit tags for Push day' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Push' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(saveTemplateTags).toHaveBeenCalledWith({
      templateId: 'one',
      tagIds: [],
    }));
  });
});
