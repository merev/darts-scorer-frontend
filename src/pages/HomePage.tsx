import { Card, Button, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <>
      <h1 className="mb-4">Darts Scorer</h1>
      <Row xs={1} md={2} className="g-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Start a New Game</Card.Title>
              <Card.Text>Set up a new darts match with your friends.</Card.Text>
              <Button as={Link} to="/new-game" variant="primary">
                New Game
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Players</Card.Title>
              <Card.Text>Manage players and see individual statistics.</Card.Text>
              <Button as={Link} to="/players" variant="secondary">
                Players
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Stats</Card.Title>
              <Card.Text>View historic games and aggregated statistics.</Card.Text>
              <Button as={Link} to="/stats" variant="outline-secondary">
                Stats
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default HomePage;
