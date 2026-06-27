import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appendLog, updateLog, getPlan } from '../../src/api/sheets.js';

vi.mock('../../src/auth/auth.js', () => ({
  getAccessToken: () => 'test-access-token',
}));

function mockFetch(...responses) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal('fetch', fn);
  return fn;
}

function okJson(body) {
  return { ok: true, json: async () => body, text: async () => JSON.stringify(body) };
}

describe('sheets.appendLog', () => {
  it('sends a POST to the correct URL and returns the sheet row', async () => {
    mockFetch(okJson({ updates: { updatedRange: 'Logs!A5:E5' } }));

    const row = await appendLog({ uuid: 'abc', exercise: 'Squat', weight: 100, reps: 5 });

    expect(row).toBe(5);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('Logs!A2%3AE:append'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-access-token' }),
      }),
    );
  });

  it('returns null when response has no updatedRange', async () => {
    mockFetch(okJson({ updates: {} }));
    const row = await appendLog({ uuid: 'x', exercise: 'X', weight: 1, reps: 1 });
    expect(row).toBeNull();
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' }));
    await expect(appendLog({ uuid: 'y', exercise: 'Y', weight: 1, reps: 1 }))
      .rejects.toThrow('Sheets append failed (HTTP 401)');
  });

  it('includes weight and reps in the POST body', async () => {
    mockFetch(okJson({ updates: { updatedRange: 'Logs!A2:E2' } }));
    await appendLog({ uuid: 'u', exercise: 'Bench', weight: 80, reps: 10 });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    const row = body.values[0];
    expect(row[0]).toBe('u');       // uuid
    expect(row[2]).toBe('Bench');   // exercise
    expect(row[3]).toBe(80);        // weight
    expect(row[4]).toBe(10);        // reps
  });
});

describe('sheets.updateLog', () => {
  it('finds the uuid in column A and writes to the correct row', async () => {
    mockFetch(
      okJson({ values: [['uuid-1'], ['uuid-2'], ['uuid-3']] }), // GET Logs!A2:A
      okJson({}),                                                 // PUT update
    );

    await updateLog('uuid-2', { weight: 90, reps: 8 });

    expect(fetch).toHaveBeenCalledTimes(2);
    // uuid-2 is at index 1 → sheetRow = 3
    expect(fetch.mock.calls[1][0]).toContain('Logs!D3%3AE3');
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.values[0]).toEqual([90, 8]);
  });

  it('throws when uuid is not found in the sheet', async () => {
    mockFetch(okJson({ values: [['other-uuid']] }));
    await expect(updateLog('missing', {})).rejects.toThrow('UUID not found in sheet: missing');
  });

  it('throws on non-ok PUT response', async () => {
    mockFetch(
      okJson({ values: [['target-uuid']] }),
      { ok: false, status: 500, text: async () => 'Server Error' },
    );
    await expect(updateLog('target-uuid', { weight: 1, reps: 1 }))
      .rejects.toThrow('Sheets update failed (HTTP 500)');
  });

  it('handles empty column A (no rows yet)', async () => {
    mockFetch(okJson({ values: [] }));
    await expect(updateLog('any-uuid', {})).rejects.toThrow('UUID not found in sheet');
  });
});

describe('sheets.getPlan', () => {
  it('maps sheet rows to plan objects', async () => {
    mockFetch(okJson({
      values: [
        ['Monday', 'Chest', 'Bench Press', '80%', '4', '8', '12', '80', 'https://yt.co/abc'],
        ['Friday', 'Legs',  'Squat',       '',    '3', '5', '8',  '',   ''],
      ],
    }));

    const plan = await getPlan();

    expect(plan).toHaveLength(2);
    expect(plan[0]).toEqual({
      id: 1, day: 'Monday', group: 'Chest', name: 'Bench Press',
      formula: '80%', sets: 4, minReps: 8, maxReps: 12, weight: '80', youtubeUrl: 'https://yt.co/abc',
    });
    expect(plan[1]).toEqual({
      id: 2, day: 'Friday', group: 'Legs', name: 'Squat',
      formula: '', sets: 3, minReps: 5, maxReps: 8, weight: '', youtubeUrl: '',
    });
  });

  it('returns empty array when sheet has no rows', async () => {
    mockFetch(okJson({ values: [] }));
    const plan = await getPlan();
    expect(plan).toEqual([]);
  });

  it('uses defaults (empty string / 0) for missing columns', async () => {
    mockFetch(okJson({ values: [['Monday']] })); // only first column
    const plan = await getPlan();
    expect(plan[0].group).toBe('');
    expect(plan[0].sets).toBe(0);
  });
});
