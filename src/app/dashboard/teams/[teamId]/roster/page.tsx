'use client';

import { useState } from 'react';
import type { CSVPreview, RosterCommitResult } from '@/types/roster';

// Local type for column index mapping (different from API's ColumnMapping)
type ColumnIndexMapping = {
  name?: number;
  email?: number;
  phone?: number;
  size?: number;
  number?: number;
  position?: number;
  notes?: number;
};

export default function RosterPage({ params }: { params: { teamId: string } }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'map' | 'commit'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnIndexMapping>({});
  const [result, setResult] = useState<RosterCommitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Upload CSV
  const handleFileUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('teamId', params.teamId);

    try {
      const res = await fetch('/api/roster/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to preview CSV');
        return;
      }

      setPreview(data.data);
      setStep('preview');
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Preview and continue to mapping
  const handlePreviewConfirm = () => {
    if (!preview) return;

    // Auto-detect column mappings
    const autoMapping: ColumnIndexMapping = {};
    preview.headers.forEach((header, index) => {
      const lower = header.toLowerCase();
      if (lower.includes('name')) autoMapping.name = index;
      if (lower.includes('email')) autoMapping.email = index;
      if (lower.includes('phone')) autoMapping.phone = index;
      if (lower.includes('size')) autoMapping.size = index;
      if (lower.includes('number') || lower.includes('jersey')) autoMapping.number = index;
      if (lower.includes('position')) autoMapping.position = index;
      if (lower.includes('note')) autoMapping.notes = index;
    });

    setMapping(autoMapping);
    setStep('map');
  };

  // Step 3: Commit mapped data
  const handleCommit = async () => {
    if (!preview || !mapping.name) {
      setError('Name column mapping is required');
      return;
    }

    setLoading(true);
    setError(null);

    // Build members array from preview data
    const members = preview.rows.map(row => {
      // Get header name from column index
      const getValueByIndex = (index: number | undefined) => {
        if (index === undefined) return undefined;
        const headerName = preview.headers[index];
        return row.data[headerName];
      };

      return {
        name: getValueByIndex(mapping.name!),
        email: getValueByIndex(mapping.email),
        phone: getValueByIndex(mapping.phone),
        size: getValueByIndex(mapping.size),
        number: getValueByIndex(mapping.number),
        position: getValueByIndex(mapping.position),
        notes: getValueByIndex(mapping.notes),
      };
    });

    try {
      const res = await fetch('/api/roster/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: params.teamId, members }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to commit roster');
        return;
      }

      setResult(data.data);
      setStep('commit');
    } catch (err) {
      setError('Failed to commit roster');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Roster Upload</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
            />
          </div>
          <button
            onClick={handleFileUpload}
            disabled={!file || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? 'Uploading...' : 'Upload and Preview'}
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Preview: {preview.totalRows} rows detected
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-100">
                  {preview.headers.map((h, i) => (
                    <th key={i} className="border px-4 py-2 text-left text-sm font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-b">
                    {preview.headers.map((header, j) => (
                      <td key={j} className="border px-4 py-2 text-sm">
                        {row.data[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handlePreviewConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Continue to Mapping
          </button>
        </div>
      )}

      {/* Step 3: Map Columns */}
      {step === 'map' && preview && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Map Columns</h2>
          {['name', 'email', 'phone', 'size', 'number', 'position', 'notes'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1 capitalize">{field} {field === 'name' && <span className="text-red-500">*</span>}</label>
              <select
                value={mapping[field as keyof ColumnIndexMapping] ?? ''}
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    [field]: e.target.value === '' ? undefined : parseInt(e.target.value),
                  }))
                }
                className="block w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">-- None --</option>
                {preview.headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button
            onClick={handleCommit}
            disabled={!mapping.name || loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
          >
            {loading ? 'Committing...' : 'Commit Roster'}
          </button>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'commit' && result && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Upload Complete</h2>
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <p className="text-green-700">Inserted: {result.inserted}</p>
            <p className="text-yellow-700">Skipped: {result.skipped}</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-red-700">Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {result.errors.map((err, i) => (
                    <li key={i}>Line {err.line}: {err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setStep('upload');
              setFile(null);
              setPreview(null);
              setMapping({});
              setResult(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}
