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
import { FaPlus } from 'react-icons/fa';
import {
  usePlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
} from '../api/players';
import type { Player } from '../types/darts';
import { useToast } from '../components/ToastProvider';
import '../styles/PlayersPage.css';

// Helper: resize/compress image before sending
async function resizeImageToDataUrl(
  file: File,
  maxSize = 256,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
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
    setModalState((prev) => ({ ...prev, visible: false }));
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

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setPlayerToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!playerToDelete) return;

    try {
      await deletePlayer(playerToDelete.id);
      showToast(`Player "${playerToDelete.name}" deleted.`, 'success');
      if (modalState.playerId === playerToDelete.id) {
        closeMainModal();
      }
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;

      if (status === 409) {
        showToast(
          'Cannot delete this player because they already have recorded games.',
          'warning'
        );
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

  const handleCardKeyDown = (e: React.KeyboardEvent, player: Player) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEditModal(player);
    }
  };

  const renderAvatarCircle = (player: Player) => {
    const dataUrl: string | undefined =
      (player.avatarData as string | undefined) ?? undefined;
    const initial = (player.name || '?').charAt(0).toUpperCase();

    return (
      <div className="d-flex justify-content-center players-avatar-wrap">
        <div className="player-avatar" aria-hidden>
          {dataUrl ? (
            <img src={dataUrl} alt={player.name} />
          ) : (
            <span className="players-initial">{initial}</span>
          )}
        </div>
      </div>
    );
  };

  const renderPlayerFormModalContent = () => {
    const isCreate = modalState.mode === 'create';
    const title = isCreate ? 'NEW PLAYER' : 'EDIT PLAYER';

    return (
      <div className="player-modal">
        <div className="player-modal__title">{title}</div>
        <div className="player-modal__subtitle">
          Enter a name and add an avatar (optional)
        </div>

        {avatarData ? (
          <div className="player-modal__preview">
            <div className="player-modal__previewCircle" aria-hidden>
              <img src={avatarData} alt="Preview" />
            </div>
          </div>
        ) : null}

        <Form.Group className="player-modal__field" controlId="playerName">
          <Form.Control
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            required
            placeholder="Player Name"
            className="player-modal__input"
          />
        </Form.Group>

        <div className="player-modal__actions">
          <button
            type="button"
            className="player-modal__actionBtn"
            onClick={triggerFileInput}
          >
            <span className="player-modal__actionPlus">+</span>
            TAKE PICTURE
          </button>

          <button
            type="button"
            className="player-modal__actionBtn player-modal__actionBtn--disabled"
            disabled
            aria-disabled="true"
            title="Not implemented yet"
          >
            <span className="player-modal__actionPlus">+</span>
            SELECT AVATAR IMAGE
          </button>

          <Form.Control
            type="file"
            accept="image/*"
            capture="user"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="d-none"
          />
        </div>

        <div className="player-modal__footer">
          <Button
            type="submit"
            className="player-modal__saveBtn"
            disabled={creating || updating || !name.trim()}
          >
            {isCreate
              ? creating
                ? 'SAVING...'
                : 'SAVE'
              : updating
                ? 'UPDATING...'
                : 'SAVE'}
          </Button>

          <button
            type="button"
            className="player-modal__cancelBtn"
            onClick={closeMainModal}
          >
            CANCEL
          </button>

          {!isCreate ? (
            <button
              type="button"
              className="player-modal__deleteBtn"
              onClick={() => {
                if (!modalState.playerId) return;
                const player =
                  players.find((x) => x.id === modalState.playerId) ?? null;
                if (!player) return;

                setModalState((prev) => ({ ...prev, visible: false }));
                setTimeout(() => {
                  setPlayerToDelete(player);
                  setShowConfirmModal(true);
                }, 0);
              }}
            >
              DELETE PLAYER
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Container className="py-3 players-page">
      {/* Header */}
      <div className="players-header mb-3">
        <div className="players-header-left">
          <div className="players-title">PLAYERS</div>
          <div className="players-subtitle">Tap on player to edit</div>
          {isError && (
            <div className="text-danger small">
              {(error as any)?.message ?? 'Could not load players.'}
            </div>
          )}
        </div>

        <div className="players-header-right">
          <Button
            className="players-add-btn"
            onClick={openCreateModal}
            aria-label="Add player"
          >
            <FaPlus />
          </Button>
        </div>
      </div>

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

      {/* Grid */}
      {!isLoading && !isError && players.length > 0 && (
        <Row xs={3} md={5} lg={6} className="players-grid">
          {players.map((p) => (
            <Col key={p.id} className="players-col">
              <Card
                className="h-100 text-center border-0 bg-transparent players-card"
                role="button"
                tabIndex={0}
                onClick={() => openEditModal(p)}
                onKeyDown={(e) => handleCardKeyDown(e, p)}
                aria-label={`Edit player ${p.name}`}
              >
                <Card.Body className="players-card-body">
                  {renderAvatarCircle(p)}
                  <Card.Text className="players-name">
                    {p.name.toUpperCase()}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create / Edit Player Modal */}
      <Modal
        show={modalState.visible}
        onHide={closeMainModal}
        centered
        dialogClassName="player-form-modal"
      >
        <Form onSubmit={handleSubmit}>
          {/* removed header close button (no X) */}
          <Modal.Body className="player-form-modal__body">
            {renderPlayerFormModalContent()}
          </Modal.Body>
        </Form>
      </Modal>

      {/* Delete confirmation modal (unchanged) */}
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
          <p className="mb-0">
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
