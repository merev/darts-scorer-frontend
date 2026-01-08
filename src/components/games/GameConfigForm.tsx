import { useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import type { GameConfig, Player } from '../../types/darts';

import '../../styles/NewGamePage.css';

export interface GameConfigFormProps {
  players: Player[];
  onSubmit: (config: GameConfig, selectedPlayerIds: string[]) => void;
  submitting?: boolean;
}

type FormatMode = 'first_to_win' | 'best_of';

const X01_OPTIONS = [301, 501, 701] as const;

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ensureOdd(n: number) {
  return n % 2 === 0 ? n + 1 : n;
}

export default function GameConfigForm({
  players,
  onSubmit,
  submitting,
}: GameConfigFormProps) {
  // Only X01 standard games
  const [startingScore, setStartingScore] = useState<number>(501);

  // In / Out toggles (false=straight, true=double)
  const [doubleIn, setDoubleIn] = useState<boolean>(false);
  const [doubleOut, setDoubleOut] = useState<boolean>(true);

  // Players
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [showPlayersModal, setShowPlayersModal] = useState(false);

  // Format
  const [formatMode, setFormatMode] = useState<FormatMode>('first_to_win');

  // First to win
  const [setsToWin, setSetsToWin] = useState<number>(1);
  const [legsToWin, setLegsToWin] = useState<number>(5);

  // Best of (odd numbers)
  const [bestOfSets, setBestOfSets] = useState<number>(1);
  const [bestOfLegs, setBestOfLegs] = useState<number>(9);

  const selectedPlayers = useMemo(
    () =>
      selectedPlayerIds
        .map((id) => players.find((p) => p.id === id))
        .filter(Boolean) as Player[],
    [players, selectedPlayerIds]
  );

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canStart = selectedPlayerIds.length >= 1 && !submitting;

  const handleSubmit = () => {
    if (!canStart) return;

    const sets =
      formatMode === 'best_of'
        ? Math.ceil(bestOfSets / 2)
        : clamp(setsToWin, 1, 99);

    const legs =
      formatMode === 'best_of'
        ? Math.ceil(bestOfLegs / 2)
        : clamp(legsToWin, 1, 199);

    const config: any = {
      mode: 'X01',
      startingScore,
      sets,
      legs,
      doubleOut, // backend-understood field

      // extra but safe:
      doubleIn,
      format: formatMode,
      bestOfSets: formatMode === 'best_of' ? bestOfSets : undefined,
      bestOfLegs: formatMode === 'best_of' ? bestOfLegs : undefined,
    };

    const randomized = shuffle(selectedPlayerIds);
    onSubmit(config as GameConfig, randomized);
  };

  const renderAvatar = (p: any) => {
    const dataUrl: string | undefined = p.avatarData ?? p.avatar ?? undefined;
    const initial = (p.name || '?').charAt(0).toUpperCase();

    return (
      <div className="ng-avatar">
        {dataUrl ? (
          <img src={dataUrl} alt={p.name} />
        ) : (
          <span className="ng-avatar__initial">{initial}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="ng-panel">
        {/* GAME TYPE */}
        <div className="ng-section">

          <div className="ng-row ng-row--center">
            {X01_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className={`ng-circle ${startingScore === v ? 'is-active' : ''}`}
                onClick={() => setStartingScore(v)}
                aria-label={`${v}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* IN / OUT (toggles) */}
        <div className="ng-section">
          <div className="ng-toggleRow">
            <div className="ng-toggleCard">
              <div className="ng-toggleCard__title">GAME IN</div>

              <label className="ng-switch" aria-label="Toggle game in (straight/double)">
                <input
                  type="checkbox"
                  checked={doubleIn}
                  onChange={(e) => setDoubleIn(e.target.checked)}
                />
                <span className="ng-switch__slider" />
              </label>

              <div className="ng-toggleCard__value">
                {doubleIn ? 'DOUBLE' : 'STRAIGHT'}
              </div>
            </div>

            <div className="ng-toggleCard">
              <div className="ng-toggleCard__title">GAME OUT</div>

              <label className="ng-switch" aria-label="Toggle game out (straight/double)">
                <input
                  type="checkbox"
                  checked={doubleOut}
                  onChange={(e) => setDoubleOut(e.target.checked)}
                />
                <span className="ng-switch__slider" />
              </label>

              <div className="ng-toggleCard__value">
                {doubleOut ? 'DOUBLE' : 'STRAIGHT'}
              </div>
            </div>
          </div>
        </div>

        {/* PLAYERS (button + selected players preview) */}
        <div className="ng-section">
          <div className="ng-section__title">PLAYERS</div>
          <div className="ng-section__subtitle">
            Choose at least one player or add a new one.
          </div>

          <div className="ng-row ng-row--center">
            <button
              type="button"
              className="ng-pill ng-pill--wide"
              onClick={() => setShowPlayersModal(true)}
            >
              {selectedPlayerIds.length > 0
                ? `SELECT PLAYERS (${selectedPlayerIds.length})`
                : 'SELECT PLAYERS'}
            </button>
          </div>

          {/* NEW: show selected players under the section */}
          {selectedPlayers.length > 0 ? (
            <div className="ng-selectedPlayers">
              {selectedPlayers.map((p) => (
                <div key={p.id} className="ng-selectedPlayer">
                  {renderAvatar(p)}
                  <div className="ng-selectedPlayer__name">
                    {String(p.name).toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ng-hint">No players selected.</div>
          )}
        </div>

        {/* FORMAT (no divider under this section) */}
        <div className="ng-section ng-section--noDivider">
          <div className="ng-tabs">
            <button
              type="button"
              className={`ng-tab ${formatMode === 'first_to_win' ? 'is-active' : ''}`}
              onClick={() => setFormatMode('first_to_win')}
            >
              FIRST TO WIN
            </button>
            <button
              type="button"
              className={`ng-tab ${formatMode === 'best_of' ? 'is-active' : ''}`}
              onClick={() => setFormatMode('best_of')}
            >
              BEST OF
            </button>
          </div>

          <div className="ng-format">
            <div className="ng-format__block">
              <div className="ng-format__label">SETS</div>
              <div className="ng-format__control">
                <button
                  type="button"
                  className="ng-miniCircle"
                  onClick={() => {
                    if (formatMode === 'best_of') {
                      setBestOfSets((v) => ensureOdd(clamp(v - 2, 1, 99)));
                    } else {
                      setSetsToWin((v) => clamp(v - 1, 1, 99));
                    }
                  }}
                  aria-label="Decrease sets"
                >
                  −
                </button>

                <div className="ng-format__value">
                  {formatMode === 'best_of' ? bestOfSets : setsToWin}
                </div>

                <button
                  type="button"
                  className="ng-miniCircle"
                  onClick={() => {
                    if (formatMode === 'best_of') {
                      setBestOfSets((v) => ensureOdd(clamp(v + 2, 1, 99)));
                    } else {
                      setSetsToWin((v) => clamp(v + 1, 1, 99));
                    }
                  }}
                  aria-label="Increase sets"
                >
                  +
                </button>
              </div>
            </div>

            <div className="ng-format__block">
              <div className="ng-format__label">LEGS</div>
              <div className="ng-format__control">
                <button
                  type="button"
                  className="ng-miniCircle"
                  onClick={() => {
                    if (formatMode === 'best_of') {
                      setBestOfLegs((v) => ensureOdd(clamp(v - 2, 1, 199)));
                    } else {
                      setLegsToWin((v) => clamp(v - 1, 1, 199));
                    }
                  }}
                  aria-label="Decrease legs"
                >
                  −
                </button>

                <div className="ng-format__value">
                  {formatMode === 'best_of' ? bestOfLegs : legsToWin}
                </div>

                <button
                  type="button"
                  className="ng-miniCircle"
                  onClick={() => {
                    if (formatMode === 'best_of') {
                      setBestOfLegs((v) => ensureOdd(clamp(v + 2, 1, 199)));
                    } else {
                      setLegsToWin((v) => clamp(v + 1, 1, 199));
                    }
                  }}
                  aria-label="Increase legs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {formatMode === 'best_of' && (
            <div className="ng-hint">
              Best of values should be odd (e.g. 3, 5, 7…). We’ll calculate “first to win”
              automatically when creating the game.
            </div>
          )}
        </div>

        {/* START */}
        <div className="ng-bottom">
          <button
            type="button"
            className={`ng-start ${canStart ? '' : 'is-disabled'}`}
            onClick={handleSubmit}
            disabled={!canStart}
          >
            {submitting ? 'CREATING...' : 'START GAME'}{' '}
            <span className="ng-start__chev">›</span>
          </button>
        </div>
      </div>

      {/* PLAYERS MODAL */}
      <Modal
        show={showPlayersModal}
        onHide={() => setShowPlayersModal(false)}
        centered
        dialogClassName="ng-playersModal"
      >
        <Modal.Body className="ng-playersModal__body">
          <div className="ng-playersModal__title">PLAYER</div>
          <div className="ng-playersModal__subtitle">
            Choose at least one player or add a new one.
          </div>

          <div className="ng-players">
            {players.map((p) => {
              const active = selectedPlayerIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`ng-player ${active ? 'is-active' : ''}`}
                  onClick={() => togglePlayer(p.id)}
                  aria-label={`Toggle player ${p.name}`}
                >
                  {renderAvatar(p)}
                  <div className="ng-player__name">{String(p.name).toUpperCase()}</div>
                </button>
              );
            })}
          </div>

          <div className="ng-playersModal__footer">
            <button
              type="button"
              className="ng-pill ng-pill--wide"
              onClick={() => setShowPlayersModal(false)}
            >
              DONE
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
