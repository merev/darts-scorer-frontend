// src/pages/StatsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Modal, Spinner, Table } from 'react-bootstrap';
import { usePlayers } from '../api/players';
import { useStatsPlayers, type PlayerStats } from '../api/stats';
import type { Player } from '../types/darts';
import '../styles/StatsPage.css';

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

  // Reset draft whenever the modal opens
  useEffect(() => {
    if (show) setDraft(selectedIds);
  }, [show, selectedIds]);

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
          <div className="text-body-secondary">Choose up to {maxPlayers} players</div>
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
                  <span className="ms-3">{checked ? 'Selected' : disabled ? 'Max' : 'Select'}</span>
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: players, isLoading: playersLoading, isError: playersError } = usePlayers();

  const {
    data: statsArrRaw,
    isLoading: statsLoading,
    isError: statsError,
  } = useStatsPlayers(selectedIds);

  // Ensure TS knows it’s not undefined
  const statsArr: PlayerStats[] = useMemo(() => statsArrRaw ?? [], [statsArrRaw]);

  const selectedPlayers = useMemo(() => {
    if (!players) return [];
    const map = new Map(players.map((p) => [p.id, p] as const));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as Player[];
  }, [players, selectedIds]);

  const headerTitle =
    selectedPlayers.length === 0 ? 'Player Stats' : `Player Stats (${selectedPlayers.length})`;

  return (
    <Container className="statsPageContainer">
      <Card className="statsCard">
        <Card.Body className="statsCardBody">
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
              {selectedIds.length > 0 && (
                <Button variant="outline-danger" onClick={() => setSelectedIds([])}>
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

          {selectedIds.length === 0 && (
            <Alert variant="info" className="mt-3 mb-0">
              No players selected yet. Click <strong>Select players</strong>.
            </Alert>
          )}

          {selectedIds.length > 0 && (
            <>
              {statsLoading && (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status" />
                  <div className="text-body-secondary mt-2">Loading stats…</div>
                </div>
              )}

              {statsError && !statsLoading && (
                <Alert variant="danger" className="mt-3">
                  Could not load stats for one or more players.
                </Alert>
              )}

              {!statsLoading && !statsError && statsArr.length > 0 && (
                <div className="statsTableWrap mt-3">
                  <Table className="statsTable mb-0 align-middle table-borderless text-body">
                    <thead>
                      <tr>
                        <th className="text-body-secondary statsLabelCol">Period</th>

                        {statsArr.map((ps) => {
                          const winPct =
                            ps.matchesPlayed > 0
                              ? (ps.matchesWon / ps.matchesPlayed) * 100
                              : 0;

                          return (
                            <th key={ps.playerId} className="statsPlayerCol">
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
                      <tr className="statsRowDivider">
                        <td className="fw-semibold text-body-secondary">AVERAGE</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            {ps.averageScore ? ps.averageScore.toFixed(1) : '-'}
                          </td>
                        ))}
                      </tr>

                      <tr className="statsSectionRow statsRowDivider">
                        <td className="fw-semibold text-body-secondary">FINISHING</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} />
                        ))}
                      </tr>

                      <tr className="statsRowDivider">
                        <td className="text-body-secondary fw-semibold">TOP FINISH</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            {ps.bestCheckout ?? '-'}
                          </td>
                        ))}
                      </tr>

                      <tr className="statsSectionRow statsRowDivider">
                        <td className="fw-semibold text-body-secondary">BEST RECORDS</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} />
                        ))}
                      </tr>

                      <tr className="statsRowDivider">
                        <td className="text-body-secondary fw-semibold">MATCHES WON</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            {ps.matchesWon}
                          </td>
                        ))}
                      </tr>

                      <tr className="statsRowDivider">
                        <td className="text-body-secondary fw-semibold">MATCHES PLAYED</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} className="fw-semibold">
                            {ps.matchesPlayed}
                          </td>
                        ))}
                      </tr>

                      <tr className="statsSectionRow statsRowDivider">
                        <td className="fw-semibold text-body-secondary">RECORDS+</td>
                        {statsArr.map((ps) => (
                          <td key={ps.playerId} />
                        ))}
                      </tr>

                      {['60+', '80+', '100+', '120+', '140+', '171', '180'].map((label) => (
                        <tr key={label} className="statsRowDivider">
                          <td className="text-body-secondary fw-semibold">{label}</td>
                          {statsArr.map((ps) => (
                            <td key={ps.playerId} className="fw-semibold">
                              -
                            </td>
                          ))}
                        </tr>
                      ))}
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
        selectedIds={selectedIds}
        onConfirm={(ids) => setSelectedIds(ids)}
        maxPlayers={4}
      />
    </Container>
  );
}

export default StatsPage;
