import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';

import { useGame, usePostThrow, useUndoThrow } from '../api/games';
import { useToast } from '../components/ToastProvider';
import type { GameState, SetScore } from '../types/darts';

import '../styles/GamePage.css';

/** helpers */
function computeLegsWonInSet(set: SetScore): Record<string, number> {
  const wins: Record<string, number> = {};
  for (const leg of set.legs) {
    if (!leg.winnerId) continue;
    wins[leg.winnerId] = (wins[leg.winnerId] ?? 0) + 1;
  }
  return wins;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getRoundNumber(game: GameState) {
  const playersCount = Math.max(1, game.players.length);
  const visits = game.history?.length ?? 0;
  return Math.floor(visits / playersCount) + 1;
}

function getCurrentLegNumber(game: GameState) {
  const ms: any = game.matchScore;
  if (!ms || !ms.sets || ms.currentSetIndex == null || ms.currentLegIndex == null) return 1;

  const set = ms.sets[ms.currentSetIndex];
  const leg = set?.legs?.[ms.currentLegIndex];
  return leg?.legNumber ?? ms.currentLegIndex + 1;
}

export default function GamePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const gameId = (params.id || (params as any).gameId || '') as string;

  // hooks (always called)
  const { data: game, isLoading, isError, error } = useGame(gameId);
  const { mutate: postThrow, isPending: posting } = usePostThrow(gameId);
  const { mutate: undoThrow, isPending: undoing } = useUndoThrow(gameId);

  const [input, setInput] = useState<string>('0');

  // ✅ IMPORTANT: keep hooks before any conditional return
  const scoreByPlayerId = useMemo(() => {
    const m = new Map<string, any>();
    const scores = game?.scores ?? [];
    for (const s of scores) m.set(s.playerId, s);
    return m;
  }, [game?.scores]);

  const legsWonByPlayer = useMemo(() => {
    const ms: any = game?.matchScore;
    if (!ms?.sets?.length) return {};
    const set = ms.sets[ms.currentSetIndex];
    if (!set) return {};
    return computeLegsWonInSet(set);
  }, [game?.matchScore]);

  const quick = useMemo(() => [26, 41, 45, 60, 81, 85], []);

  // show toast for load error (side effect goes in effect, not render)
  useEffect(() => {
    if (isError) {
      showToast('Could not load game. Please try again.', 'danger');
    }
  }, [isError, showToast]);

  // ---------- render branches (safe now) ----------
  if (!gameId) {
    return (
      <div className="gp-wrap">
        <Alert variant="danger">No game id in URL.</Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="gp-wrap gp-center">
        <Spinner animation="border" role="status" className="mb-2" />
        <div>Loading game...</div>
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="gp-wrap">
        <Alert variant="danger">
          <Alert.Heading>Could not load game</Alert.Heading>
          <div className="mb-0 small text-muted">
            {(error as any)?.message ?? 'Unknown error'}
          </div>
        </Alert>
      </div>
    );
  }

  // ---------- actual UI ----------
  const isFinished = game.status === 'finished';

  const currentPlayer =
    game.players.find((p) => p.id === game.currentPlayerId) ?? game.players[0];

  const roundNumber = getRoundNumber(game);
  const legNumber = getCurrentLegNumber(game);

  const leftPlayer = game.players[0] ?? null;
  const rightPlayer = game.players[1] ?? null;

  const leftRemaining = leftPlayer ? scoreByPlayerId.get(leftPlayer.id)?.remaining : null;
  const rightRemaining = rightPlayer ? scoreByPlayerId.get(rightPlayer.id)?.remaining : null;

  const isCurrent = (id?: string) => id && id === game.currentPlayerId;

  const setDigit = (d: string) => {
    if (isFinished || posting) return;
    if (input === '0') return setInput(d);
    if (input.length >= 3) return;
    setInput((prev) => prev + d);
  };

  const setQuick = (n: number) => {
    if (isFinished || posting) return;
    setInput(String(n));
  };

  const backspace = () => {
    if (isFinished || posting) return;
    setInput((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const submit = () => {
    if (isFinished || posting) return;

    const value = Number(input);
    if (!Number.isFinite(value)) return;

    const visitScore = clamp(value, 0, 180);
    if (!currentPlayer) return;

    postThrow(
      { playerId: currentPlayer.id, visitScore, dartsThrown: 3 },
      {
        onSuccess() {
          showToast('Throw recorded.', 'success');
          setInput('0');
        },
        onError(err: any) {
          console.error('Failed to post throw', err);
          showToast('Failed to post throw. Please try again.', 'danger');
        },
      }
    );
  };

  const onUndo = () => {
    if (undoing || posting) return;
    undoThrow(undefined, {
      onSuccess() {
        showToast('Last throw undone.', 'info');
      },
      onError(err: any) {
        console.error('Failed to undo throw', err);
        showToast('Failed to undo last throw.', 'danger');
      },
    });
  };

  return (
    <div className="gp-wrap">
      <div className="gp-top">
        <div className="gp-top__left">
          <span className="gp-top__label">LEG {legNumber}</span>
          <span className="gp-top__label">ROUND {roundNumber}</span>
        </div>

        <div className="gp-top__right">
          <span className="gp-top__live">LIVE</span>

          <button
            type="button"
            className="gp-iconBtn"
            aria-label="Settings"
            onClick={() => showToast('Settings coming soon.', 'info')}
          >
            ⚙️
          </button>

          <button
            type="button"
            className="gp-iconBtn"
            aria-label="Exit game"
            onClick={() => navigate(-1)}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="gp-panels">
        <div className={`gp-panel ${isCurrent(leftPlayer?.id) ? 'is-current' : ''}`}>
          <div className="gp-panel__marker">{isCurrent(leftPlayer?.id) ? '➤' : ''}</div>
          <div className="gp-panel__score">{leftRemaining ?? '-'}</div>
          <div className="gp-panel__name">{leftPlayer?.name?.toUpperCase() ?? '-'}</div>
          <div className="gp-panel__meta">
            {(legsWonByPlayer[leftPlayer?.id ?? ''] ?? 0)} LEGS WON
          </div>
          <div className="gp-panel__avg">0.0</div>
        </div>

        <div className={`gp-panel ${isCurrent(rightPlayer?.id) ? 'is-current' : ''}`}>
          <div className="gp-panel__marker">{isCurrent(rightPlayer?.id) ? '➤' : ''}</div>
          <div className="gp-panel__score">{rightRemaining ?? '-'}</div>
          <div className="gp-panel__name">{rightPlayer?.name?.toUpperCase() ?? '-'}</div>
          <div className="gp-panel__meta">
            {(legsWonByPlayer[rightPlayer?.id ?? ''] ?? 0)} LEGS WON
          </div>
          <div className="gp-panel__avg">0.0</div>
        </div>
      </div>

      <div className="gp-inputRow">
        <div className="gp-input">{input}</div>

        <button
          type="button"
          className="gp-undo"
          onClick={onUndo}
          disabled={undoing || posting || (game.history?.length ?? 0) === 0}
        >
          UNDO
        </button>
      </div>

      <div className="gp-pad">
        {quick.map((n) => (
          <button
            key={`q-${n}`}
            type="button"
            className="gp-key gp-key--quick"
            onClick={() => setQuick(n)}
            disabled={posting || isFinished}
          >
            {n}
          </button>
        ))}

        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            className="gp-key"
            onClick={() => setDigit(d)}
            disabled={posting || isFinished}
          >
            {d}
          </button>
        ))}

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={backspace}
          disabled={posting || isFinished}
          aria-label="Backspace"
        >
          ‹
        </button>

        <button
          type="button"
          className="gp-key"
          onClick={() => setDigit('0')}
          disabled={posting || isFinished}
        >
          0
        </button>

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={submit}
          disabled={posting || isFinished}
          aria-label="Submit"
        >
          ›
        </button>
      </div>
    </div>
  );
}
