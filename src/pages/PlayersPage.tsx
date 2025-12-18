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
  Toast,
  ToastContainer,
} from 'react-bootstrap';
import {
  usePlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
} from '../api/players';
import type { Player } from '../types/darts';

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

type ToastVariant = 'success' | 'danger' | 'warning' | 'info';

function PlayersPage() {
  const { data, isLoading, isError, error } = usePlayers();
  const players = Array.isArray(data) ? data : [];

  const { mutateAsync: createPlayer, isPending: creating } = useCreatePlayer();
  const { mutateAsync: updatePlayer, isPending: updating } = useUpdatePlayer();
  const { mutateAsync: deletePlayer, isPending: deleting } = useDeletePlayer();

  // Create/Edit modal state
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

  // Delete confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<ToastVariant>('info');

  const showToastMessage = (message: string, variant: ToastVariant = 'info') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  // ----- Create / Edit modal -----

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
      showToastMessage('Could not process image. Please try another photo.', 'danger');
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
        showToastMessage('Player created successfully.', 'success');
      } else if (modalState.mode === 'edit' && modalState.playerId) {
        await updatePlayer({
          id: modalState.playerId,
          name: trimmed,
          avatarData: avatarData ?? null,
        });
        showToastMessage('Player updated successfully.', 'success');
      }
      closeMainModal();
    } catch (err) {
      console.error('Failed to save player', err);
      showToastMessage('Failed to save player. Please try again.', 'danger');
    }
  };

  // ----- Delete confirmation flow -----

  const requestDelete = (player: Player) => {
    setPlayerToDelete(player);
    setShowConfirmModal(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setPlayerToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!playerToDelete) return;

    try {
      await deletePlayer(playerToDelete.id);
      showToastMessage(`Player "${playerToDelete.name}" deleted.`, 'success');
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;

      if (status === 409) {
        showToastMessage(
          'Cannot delete this player because they already have recorded games.',
          'warning'
        );
      } else if (status === 404) {
        showToastMessage('Player not found (maybe already deleted).', 'warning');
      } else {
        console.error('Failed to delete player', err);
        showToastMessage('Failed to delete player. Please try again.', 'danger');
      }
    } finally {
      setShowConfirmModal(false);
      setPlayerToDelete(null);
    }
  };

  // ----- Avatar rendering -----

  const renderAvatarCircle = (player: Player) => {
    const dataUrl: string | undefined =
      (player.avatarData as string | undefined) ?? undefined;
    const initial = (player.name || '?').charAt(0).toUpperCase();

    return (
      <div className="d-flex justify-content-center mb-2">
        <div
          className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center"
          style={{
            width: 80,
            height: 80,
            backgroundColor: '#e9ecef',
            border: '2px solid #dee2e6',
          }}
        >
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={player.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontSize: '1.5rem',
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

  const renderModalAvatarPreview = () => {
    const initial = name.trim()
      ? name.trim().charAt(0).toUpperCase()
      : '?';

    return (
      <div className="d-flex flex-column align-items-center mb-3">
        <div
          className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center mb-2"
          style={{
            width: 96,
            height: 96,
            backgroundColor: '#e9ecef',
            border: '2px solid #dee2e6',
          }}
        >
          {avatarData ? (
            <img
              src={avatarData}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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

  // ----- JSX -----

  return (
    <Container className="py-3">
      {/* Toasts */}
      <ToastContainer position="top-end" className="p-3">
        <Toast
          bg={toastVariant}
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={4000}
          autohide
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Players</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

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
          <Button onClick={openCreateModal}>
            +
          </Button>
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
        <Alert variant="danger">
          Could not load players from the backend.
        </Alert>
      )}

      {!isLoading && !isError && players.length === 0 && (
        <Alert variant="info">
          No players yet. Click the <strong>+</strong> button to add one.
        </Alert>
      )}

      {/* Players as cards */}
      {!isLoading && !isError && players.length > 0 && (
        <Row xs={3} md={5} lg={6} className="g-3">
          {players.map((p) => (
            <Col key={p.id}>
              <Card className="h-100 text-center">
                <Card.Body>
                  {renderAvatarCircle(p)}
                  <Card.Text className="fw-semibold mb-2">
                    {p.name}
                  </Card.Text>
                  {p.stats && (
                    <div className="text-muted small mb-2">
                      <div>Matches: {p.stats.matchesPlayed}</div>
                      <div>Wins: {p.stats.matchesWon}</div>
                      <div>
                        Avg:{' '}
                        {p.stats.averageScore != null
                          ? p.stats.averageScore.toFixed(2)
                          : '-'}
                      </div>
                    </div>
                  )}

                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => openEditModal(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      disabled={deleting}
                      onClick={() => requestDelete(p)}
                    >
                      Delete
                    </Button>
                  </div>
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
      >
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

            <div className="text-muted small">
              If no photo is taken, an avatar with the player's initial will be used.
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={closeMainModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={(creating || updating) || !name.trim()}
            >
              {modalState.mode === 'create'
                ? creating ? 'Saving...' : 'Save'
                : updating ? 'Updating...' : 'Update'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        show={showConfirmModal}
        onHide={handleCancelDelete}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Player</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete{' '}
            <strong>{playerToDelete?.name}</strong>? This action cannot be
            undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PlayersPage;
