// src/pages/PlayersPage.tsx
import { useRef, useState } from 'react';
import {
  Card,
  Button,
  Row,
  Col,
  Alert,
  Container,
  Modal,
  Form,
  Spinner,
} from 'react-bootstrap';
import {
  usePlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
} from '../api/players';
import type { Player } from '../types/darts';
import { useToast } from '../components/ToastProvider';

// Helper: resize/compress image before sending
async function resizeImageToDataUrl(
  file: File,
  maxSize = 256,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const { width, height } = img;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = reject;

    reader.readAsDataURL(file);
  });
}

type Mode = 'create' | 'edit';

interface ModalState {
  mode: Mode;
  visible: boolean;
  playerId?: string;
  initialName: string;
  initialAvatar?: string | null;
}

function PlayersPage() {
  const { data, isLoading, isError, error } = usePlayers();
  const players = Array.isArray(data) ? data : [];

  const { mutateAsync: createPlayer, isPending: creating } = useCreatePlayer();
  const { mutateAsync: updatePlayer, isPending: updating } = useUpdatePlayer();
  const { mutateAsync: deletePlayer, isPending: deleting } = useDeletePlayer();

  const { showToast } = useToast();

  // Modal state (create/edit)
  const [modalState, setModalState] = useState<ModalState>({
    mode: 'create',
    visible: false,
    playerId: undefined,
    initialName: '',
    initialAvatar: undefined,
  });

  const [name, setName] = useState('');
  const [avatarData, setAvatarData] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Confirmation modal (for delete)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  // ---- Helpers ----

  const openCreateModal = () => {
    setModalState({
      mode: 'create',
      visible: true,
      playerId: undefined,
      initialName: '',
      initialAvatar: undefined,
    });
    setName('');
    setAvatarData(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditModal = (player: Player) => {
    setModalState({
      mode: 'edit',
      visible: true,
      playerId: player.id,
      initialName: player.name,
      initialAvatar: player.avatarData ?? undefined,
    });
    setName(player.name);
    setAvatarData(player.avatarData ?? undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeMainModal = () => {
    setModalState(prev => ({ ...prev, visible: false }));
    setName('');
    setAvatarData(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImageToDataUrl(file, 256, 0.7);
      setAvatarData(resized);
    } catch (err) {
      console.error('Failed to resize image', err);
      showToast('Could not process image. Please try another photo.', 'danger');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      if (modalState.mode === 'create') {
        await createPlayer({
          name: trimmed,
          avatarData,
        });
        showToast('Player created successfully.', 'success');
      } else if (modalState.mode === 'edit' && modalState.playerId) {
        await updatePlayer({
          id: modalState.playerId,
          name: trimmed,
          avatarData: avatarData ?? null,
        });
        showToast('Player updated successfully.', 'success');
      }
      closeMainModal();
    } catch (err) {
      console.error('Failed to save player', err);
      showToast('Failed to save player. Please try again.', 'danger');
    }
  };

  // Request delete from inside modal or other places.
  // This will show the confirmation dialog.
  const requestDelete = (player: Player) => {
    setPlayerToDelete(player);
    setShowConfirmModal(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setPlayerToDelete(null);
  };

  // Called when the user confirms deletion in the confirmation modal.
  // After delete we also close the edit modal if it was open.
  const handleConfirmDelete = async () => {
    if (!playerToDelete) return;

    try {
      await deletePlayer(playerToDelete.id);
      showToast(`Player "${playerToDelete.name}" deleted.`, 'success');
      // close edit modal if the deleted player is currently being edited
      if (modalState.playerId === playerToDelete.id) {
        closeMainModal();
      }
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;

      if (status === 409) {
        showToast('Cannot delete this player because they already have recorded games.', 'warning');
      } else if (status === 404) {
        showToast('Player not found (maybe already deleted).', 'warning');
      } else {
        console.error('Failed to delete player', err);
        showToast('Failed to delete player. Please try again.', 'danger');
      }
    } finally {
      setShowConfirmModal(false);
      setPlayerToDelete(null);
    }
  };

  // Keyboard accessibility: Enter or Space opens the card
  const handleCardKeyDown = (e: React.KeyboardEvent, player: Player) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEditModal(player);
    }
  };

  // Avatar rendering helpers
  const renderAvatarCircle = (player: Player) => {
    const dataUrl: string | undefined =
      (player.avatarData as string | undefined) ?? undefined;
    const initial = (player.name || '?').charAt(0).toUpperCase();

    return (
      <div className="d-flex justify-content-center mb-2">
        <div className="player-avatar" aria-hidden>
          {dataUrl ? (
            <img src={dataUrl} alt={player.name} />
          ) : (
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#495057',
              }}
            >
              {initial}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Avatar preview inside the modal (bigger)
  const renderModalAvatarPreview = () => {
    const initial = name.trim()
      ? name.trim().charAt(0).toUpperCase()
      : '?';

    return (
      <div className="d-flex flex-column align-items-center mb-3">
        <div className="player-avatar player-avatar--preview mb-2" aria-hidden>
          {avatarData ? (
            <img src={avatarData} alt="Preview" />
          ) : (
            <span
              style={{
                fontSize: '2rem',
                fontWeight: 600,
                color: '#495057',
              }}
            >
              {initial}
            </span>
          )}
        </div>

        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={triggerFileInput}
        >
          Take Photo
        </Button>

        <Form.Control
          type="file"
          accept="image/*"
          capture="user"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="d-none"
        />
      </div>
    );
  };

  // ---- JSX ----
  return (
    <Container className="py-3">
      {/* Header row */}
      <Row className="align-items-center mb-3">
        <Col>
          <h2 className="mb-0">Players</h2>
          {isError && (
            <small className="text-danger">
              {(error as any)?.message ?? 'Could not load players.'}
            </small>
          )}
        </Col>
        <Col className="text-end">
          <Button onClick={openCreateModal}>+</Button>
        </Col>
      </Row>

      {/* Loading / error / empty states */}
      {isLoading && (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-2" />
          <div>Loading players...</div>
        </div>
      )}

      {!isLoading && isError && (
        <Alert variant="danger">Could not load players from the backend.</Alert>
      )}

      {!isLoading && !isError && players.length === 0 && (
        <Alert variant="info">
          No players yet. Click the <strong>+</strong> button to add one.
        </Alert>
      )}

      {/* Players as borderless, transparent cards (entire card clickable) */}
      {!isLoading && !isError && players.length > 0 && (
        <Row xs={3} md={5} lg={6} className="g-3">
          {players.map((p) => (
            <Col key={p.id}>
              <Card
                className="h-100 text-center border-0 bg-transparent"
                role="button"
                tabIndex={0}
                onClick={() => openEditModal(p)}
                onKeyDown={(e) => handleCardKeyDown(e, p)}
                style={{ cursor: 'pointer' }}
                aria-label={`Edit player ${p.name}`}
              >
                <Card.Body>
                  {renderAvatarCircle(p)}
                  <Card.Text className="fw-semibold mb-1">{p.name}</Card.Text>
                  {p.stats && (
                    <div className="text-muted small mb-1">
                      <div>Matches: {p.stats.matchesPlayed}</div>
                      <div>Wins: {p.stats.matchesWon}</div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create / Edit Player Modal (contains Delete button) */}
      <Modal show={modalState.visible} onHide={closeMainModal} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {modalState.mode === 'create' ? 'Add Player' : 'Edit Player'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {renderModalAvatarPreview()}

            <Form.Group className="mb-3" controlId="playerName">
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter player name"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between">
            {/* Delete button visible only when editing an existing player */}
            {modalState.mode === 'edit' ? (
              <Button
                variant="outline-danger"
                onClick={() => {
                  if (!modalState.playerId) return;
                  const player = players.find((x) => x.id === modalState.playerId) ?? null;
                  if (!player) return;

                  // IMPORTANT: close the edit modal first (avoids stacked modal layout issues on mobile)
                  setModalState(prev => ({ ...prev, visible: false }));

                  // then open confirm modal on next tick
                  setTimeout(() => {
                    setPlayerToDelete(player);
                    setShowConfirmModal(true);
                  }, 0);
                }}
              >
                Delete
              </Button>
            ) : (
              <div /> // spacer to keep Save button right-aligned
            )}

            <div>
              <Button variant="secondary" type="button" onClick={closeMainModal} className="me-2">
                Cancel
              </Button>
              <Button type="submit" disabled={(creating || updating) || !name.trim()}>
                {modalState.mode === 'create'
                  ? creating ? 'Saving...' : 'Save'
                  : updating ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        show={showConfirmModal}
        onHide={handleCancelDelete}
        centered
        size="sm"
        dialogClassName="delete-player-modal"
        className="delete-player-modal-parent"
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Player</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete <strong>{playerToDelete?.name}</strong>? This action
            cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PlayersPage;
