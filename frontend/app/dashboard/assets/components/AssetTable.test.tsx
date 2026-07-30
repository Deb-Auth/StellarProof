import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AssetTable from "./AssetTable";
import { MOCK_ASSETS, DigitalAsset } from "@/services/assetsMock";

const mockAssets: DigitalAsset[] = [
  ...MOCK_ASSETS,
  { id: 'asset-9', name: 'Zebra Stripes', type: 'Image', owner: 'user-1', contentHash: 'hash9', kmsEncryptionStatus: 'encrypted', status: 'verified', sizeBytes: 1024, verifiedAt: '2023-01-09' },
  { id: 'asset-10', name: 'Apple Logo', type: 'Image', owner: 'user-1', contentHash: 'hash10', kmsEncryptionStatus: 'encrypted', status: 'verified', sizeBytes: 2048, verifiedAt: '2023-01-10' },
  { id: 'asset-11', name: 'Google Banner', type: 'Image', owner: 'user-1', contentHash: 'hash11', kmsEncryptionStatus: 'encrypted', status: 'verified', sizeBytes: 4096, verifiedAt: '2023-01-11' },
  { id: 'asset-12', name: 'Microsoft Word Doc', type: 'Document', owner: 'user-1', contentHash: 'hash12', kmsEncryptionStatus: 'unencrypted', status: 'pending', sizeBytes: 8192, verifiedAt: '2023-01-12' },
];

describe("AssetTable", () => {
  it("renders a header for every column", () => {
    render(<AssetTable assets={mockAssets} />);
    ["Asset", "Type", "Owner", "Content Hash", "KMS Encryption", "Verified At", "Status", "Size"].forEach((heading) => {
        const header = screen.getByText(heading);
        expect(header).toBeInTheDocument();
        expect(header.tagName).toBe('TH');
    });
  });

  it("renders a row for every asset on the first page", () => {
    render(<AssetTable assets={mockAssets} />);
    expect(screen.getAllByRole("row")).toHaveLength(11); // 1 header + 10 rows
  });

  it("renders a loading skeleton", () => {
    const { container } = render(<AssetTable assets={[]} isLoading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders an empty state when there are no assets", () => {
    render(<AssetTable assets={[]} />);
    expect(screen.getByText(/no assets found/i)).toBeInTheDocument();
  });

  it("sorts by asset name when header is clicked", () => {
    render(<AssetTable assets={mockAssets} />);
    const assetHeader = screen.getByText("Asset");
    
    // Initial render (unsorted)
    let rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent(mockAssets[0].name);

    // Sort ascending
    fireEvent.click(assetHeader);
    rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Apple Logo");

    // Sort descending
    fireEvent.click(assetHeader);
    rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Zebra Stripes");
  });

  it("paginates through the assets", () => {
    render(<AssetTable assets={mockAssets} />);
    
    // Check initial page
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText(mockAssets[0].name)).toBeInTheDocument();
    expect(screen.queryByText(mockAssets[10].name)).not.toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeDisabled();

    // Go to next page
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.queryByText(mockAssets[0].name)).not.toBeInTheDocument();
    expect(screen.getByText(mockAssets[10].name)).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeDisabled();

    // Go back to previous page
    fireEvent.click(screen.getByText("Previous"));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText(mockAssets[0].name)).toBeInTheDocument();
  });
});
