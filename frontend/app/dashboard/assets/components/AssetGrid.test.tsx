import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AssetGrid, { Asset } from './AssetGrid';

const mockAssets: Asset[] = [
  { id: '1', title: 'C', createdAt: '2023-01-03', type: 'image', thumbnailUrl: '', status: 'verified' },
  { id: '2', title: 'A', createdAt: '2023-01-01', type: 'image', thumbnailUrl: '', status: 'verified' },
  { id: '3', title: 'B', createdAt: '2023-01-02', type: 'image', thumbnailUrl: '', status: 'verified' },
  { id: '4', title: 'D', createdAt: '2023-01-04', type: 'image', thumbnailUrl: '', status: 'verified' },
  { id: '5', title: 'E', createdAt: '2023-01-05', type: 'image', thumbnailUrl: '', status: 'verified' },
  { id: '6', title: 'F', createdAt: '2023-01-06', type: 'image', thumbnailUrl: '', status: 'verified' },
  { id: '7', title: 'G', createdAt: '2023-01-07', type: 'image', thumbnailUrl: '', status: 'verified' },
  { id: '8', title: 'H', createdAt: '2023-01-08', type: 'image', thumbnailUrl: '', status: 'verified' },
  { id: '9', title: 'I', createdAt: '2023-01-09', type: 'image', thumbnailUrl: '', status: 'verified' },
];

describe('AssetGrid', () => {
  it('renders assets sorted by newest first by default', () => {
    render(<AssetGrid assets={mockAssets} />);
    const assetTitles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(assetTitles[0]).toBe('I');
  });

  it('sorts assets by title alphabetically', () => {
    render(<AssetGrid assets={mockAssets} />);
    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'title-asc' } });
    const assetTitles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(assetTitles[0]).toBe('A');
  });

  it('paginates through assets', () => {
    render(<AssetGrid assets={mockAssets} />);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getAllByRole('article').length).toBe(8);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getAllByRole('article').length).toBe(1);

    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getAllByRole('article').length).toBe(8);
  });

  it('renders empty state', () => {
    render(<AssetGrid assets={[]} />);
    expect(screen.getByText('No verified assets yet')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    render(<AssetGrid assets={[]} isLoading={true} />);
    expect(screen.getAllByRole('heading', { level: 3 })[0]).toBeInTheDocument();
  });
});
