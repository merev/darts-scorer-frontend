import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Modal, Spinner, Table } from 'react-bootstrap';
import { usePlayers } from '../api/players';
import { useStatsPlayer } from '../api/stats';
import type { Player } from '../types/darts';

type Selected = {
  ids: string[];
};

function clampSelection(next: string[], max: number) {
  if (next.length <= max) return next;
  return next.slice(0, max);
}

function formatPct(num: number) {
  if (!Number.isFinite(num)) return '-';
  return `${Math.round(num)}%`;
}

function PlayerSelectModal({
  show,
  onHide,
  players,
  loading,
  selectedIds,
  onConfirm,
  maxPlayers = 4,
}: {
  show: boolean;
  onHide: () => void;
  players: Player[] | undefined;
  loading: boolean;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  maxPlayers?: number;
}) {
  const [draft, setDraft] = useState<string[]>(selectedIds);

  // Reset draft when opening
  // (keeps it feeling like the “new game” wizard selection UX)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (show) setDraft(selectedIds);
    return null;
  }, [show]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : clampSelection([...prev, id], maxPlayers);
      return next;
    });
  };

  const selectedCount = draft.length;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Select players</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="text-body-secondary">
            Choose up to {maxPlayers} players
          </div>
          <Badge bg={selectedCount > 0 ? 'primary' : 'secondary'}>
            {selectedCount}/{maxPlayers}
          </Badge>
        </div>

        {loading && (
          <div className="text-center py-3">
            <Spinner animation="border" role="status" />
          </div>
        )}

        {!loading && (!players || players.length === 0) && (
          <Alert variant="warning" className="mb-0">
            No players found. Create players first.
          </Alert>
        )}

        {!loading && players && players.length > 0 && (
          <div className="d-flex flex-column gap-2">
            {players.map((p) => {
              const checked = draft.includes(p.id);
              const disabled = !checked && draft.length >= maxPlayers;

              return (
                <Button
                  key={p.id}
                  variant={checked ? 'primary' : 'outline-secondary'}
                  className="d-flex justify-content-between align-items-center text-start"
                  onClick={() => toggle(p.id)}
                  disabled={disabled}
                >
                  <span className="fw-semibold">{p.name}</span>
                  <span className="ms-3">
                    {checked ? 'Selected' : disabled ? 'Max' : 'Select'}
                  </span>
                </Button>
              );
            })}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onConfirm(draft);
            onHide();
          }}
          disabled={draft.length === 0}
        >
          Apply
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function StatsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Selected>({ ids: [] });

  const { data: players, isLoading: playersLoading, isError: playersError } = usePlayers();

  // Fetch stats for up to 4 selected players (simple + reliable).
  const s0 = useStatsPlayer(selected.ids[0]);
  const s1 = useStatsPlayer(selected.ids[1]);
  const s2 = useStatsPlayer(selected.ids[2]);
  const s3 = useStatsPlayer(selected.ids[3]);

  const statsArr = useMemo(() => {
    return [s0.data, s1.data, s2.data, s3.data].filter(
      (ps): ps is NonNullable<typeof ps> => ps !== undefined
    );
  }, [s0.data, s1.data, s2.data, s3.data]);


  const anyStatsLoading =
    (selected.ids[0] && s0.isLoading) ||
    (selected.ids[1] && s1.isLoading) ||
    (selected.ids[2] && s2.isLoading) ||
    (selected.ids[3] && s3.isLoading);

  const anyStatsError = s0.isError || s1.isError || s2.isError || s3.isError;

  const selectedPlayers = useMemo(() => {
    if (!players) return [];
    const map = new Map(players.map((p) => [p.id, p]));
    return selected.ids.map((id) => map.get(id)).filter(Boolean) as Player[];
  }, [players, selected.ids]);

  const headerTitle =
    selectedPlayers.length === 0 ? 'Player Stats' : `Player Stats (${selectedPlayers.length})`;

  return (
    <Container>
      <Card>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div>
              <Card.Title className="mb-1">{headerTitle}</Card.Title>
              <div className="text-body-secondary">
                Select up to 4 players to compare their stats.
              </div>
            </div>

            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => setModalOpen(true)}>
                Select players
              </Button>
              {selected.ids.length > 0 && (
                <Button
                  variant="outline-danger"
                  onClick={() => setSelected({ ids: [] })}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {playersError && (
            <Alert variant="danger" className="mt-3">
              Could not load players.
            </Alert>
          )}

          {selected.ids.length === 0 && (
            <Alert variant="info" className="mt-3 mb-0">
              No players selected yet. Click <strong>Select players</strong>.
            </Alert>
          )}

          {selected.ids.length > 0 && (
            <>
              {anyStatsLoading && (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status" />
                  <div className="text-body-secondary mt-2">Loading stats…</div>
                </div>
              )}

              {anyStatsError && !anyStatsLoading && (
                <Alert variant="danger" className="mt-3">
                  Could not load stats for one or more players.
                </Alert>
              )}

              {!anyStatsLoading && !anyStatsError && (
                // Horizontal scroll container (critical for 3–4 columns on small screens)
                <div className="mt-3" style={{ overflowX: 'auto' }}>
                  <Table
                    responsive={false}
                    className="mb-0 align-middle"
                    style={{ minWidth: 520 }} // forces horizontal scroll on small screens
                  >
                    <thead>
                      <tr>
                        <th className="text-body-secondary" style={{ width: 200 }}>
                          Period
                        </th>
                        {statsArr.map((ps) => {
                          const winPct =
                            ps.matchesPlayed > 0
                              ? (ps.matchesWon / ps.matchesPlayed) * 100
                              : 0;

                          return (
                            <th key={ps.playerId} style={{ minWidth: 180 }}>
                              <div className="fw-bold">{ps.playerName?.toUpperCase()}</div>
                              <div className="text-body-secondary small">
                                {ps.matchesPlayed} matches • {formatPct(winPct)} wins
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {/* Average */}
                      <tr>
                        <td className="fw-semibold text-body-secondary">AVERAGE</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            {ps.averageScore ? ps.averageScore.toFixed(1) : '-'}
                          </td>
                        ))}
                      </tr>

                      {/* Finishing */}
                      <tr>
                        <td className="fw-semibold text-body-secondary pt-4">FINISHING</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="pt-4" />
                        ))}
                      </tr>

                      <tr>
                        <td className="text-body-secondary fw-semibold">TOP FINISH</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            {ps.bestCheckout ?? '-'}
                          </td>
                        ))}
                      </tr>

                      {/* Best records */}
                      <tr>
                        <td className="fw-semibold text-body-secondary pt-4">BEST RECORDS</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="pt-4" />
                        ))}
                      </tr>

                      <tr>
                        <td className="text-body-secondary fw-semibold">MATCHES WON</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            {ps.matchesWon}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="text-body-secondary fw-semibold">MATCHES PLAYED</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            {ps.matchesPlayed}
                          </td>
                        ))}
                      </tr>

                      {/* Placeholder rows for the rest of the screenshot stats */}
                      <tr>
                        <td className="fw-semibold text-body-secondary pt-4">RECORDS+</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="pt-4" />
                        ))}
                      </tr>

                      <tr>
                        <td className="text-body-secondary fw-semibold">60+</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            -
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-body-secondary fw-semibold">80+</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            -
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-body-secondary fw-semibold">100+</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            -
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-body-secondary fw-semibold">120+</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            -
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-body-secondary fw-semibold">140+</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            -
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-body-secondary fw-semibold">171</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            -
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-body-secondary fw-semibold">180</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            -
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      <PlayerSelectModal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        players={players}
        loading={playersLoading}
        selectedIds={selected.ids}
        onConfirm={(ids) => setSelected({ ids })}
        maxPlayers={4}
      />
    </Container>
  );
}

export default StatsPage;
