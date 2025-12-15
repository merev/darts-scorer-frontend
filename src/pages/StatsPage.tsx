import { Container, Card, Row, Col } from 'react-bootstrap';

function StatsPage() {
  return (
    <Container>
      <Row className="g-4">
        <Col lg={8}>
          <Card>
            <Card.Body>
              <Card.Title>Overview</Card.Title>
              <p>
                This page will show your overall darts statistics once the backend is in
                place:
              </p>
              <ul>
                <li>Games played per player and per mode</li>
                <li>Win rates and leg/sets breakdown</li>
                <li>Average scores and best checkouts</li>
              </ul>
              <p className="mb-0 text-muted small">
                The layout is ready – we just need to connect it to the Go stats API
                later.
              </p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Body>
              <Card.Title>Session highlights</Card.Title>
              <p className="text-muted mb-1">
                In the future this card can show a quick summary:
              </p>
              <ul className="mb-0 small text-muted">
                <li>Top performer of the last session</li>
                <li>Best leg of the night</li>
                <li>Most common game mode</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default StatsPage;
