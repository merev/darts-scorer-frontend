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
import { usePlayers, useCreatePlayer } from '../api/players';

function PlayersPage() {
  const { data, isLoading, isError, error } = usePlayers();
  const players = Array.isArray(data) ? data : [];

  const {
    mutateAsync: createPlayer,
    isPending: creating,
  } = useCreatePlayer();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [avatarData, setAvatarData] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openModal = () => {
    setShowModal(true);
    setNewName('');
    setAvatarData(undefined);
  };

  const closeModal = () => {
    setShowModal(false);
    setNewName('');
    setAvatarData(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    await createPlayer({
      name: trimmed,
      avatarData, // may be undefined -> backend stores null
    });

    closeModal();
  };

  const renderAvatarCircle = (player: any) => {
    const dataUrl: string | undefined = player.avatarData || undefined;
    const initial = (player.name || '?').charAt(0).toUpperCase();

    return (
      <div
        className="d-flex justify-content-center mb-2"
      >
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
          <Button onClick={openModal}>
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
          {players.map((p: any) => (
            <Col key={p.id}>
              <Card className="h-100 text-center">
                <Card.Body>
                  {renderAvatarCircle(p)}
                  <Card.Text className="fw-semibold mb-1">
                    {p.name}
                  </Card.Text>
                  {/* Optional stats below name */}
                  {p.stats && (
                    <div className="text-muted small">
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
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Add Player Modal */}
      <Modal show={showModal} onHide={closeModal} centered>
        <Form onSubmit={handleCreatePlayer}>
          <Modal.Header closeButton>
            <Modal.Title>Add Player</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Avatar preview */}
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
                    {newName.trim()
                      ? newName.trim().charAt(0).toUpperCase()
                      : '?'}
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

            <Form.Group className="mb-3" controlId="playerName">
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Enter player name"
              />
            </Form.Group>

            <div className="text-muted small">
              If no photo is taken, an avatar with the player's initial will be used.
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !newName.trim()}
            >
              {creating ? 'Saving...' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default PlayersPage;
