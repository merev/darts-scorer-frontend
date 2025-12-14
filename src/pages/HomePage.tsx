import { Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Stack,
  ListGroup
} from 'react-bootstrap';
import { GiDart, GiBullseye } from 'react-icons/gi';
import { FaUsers, FaChartLine, FaDocker, FaReact, FaServer } from 'react-icons/fa';

import './home.css';

function HomePage() {
  return (
    <div className="home-root">
      {/* HERO */}
      <section className="home-hero">
        <Container>
          <Row className="align-items-center">
            <Col lg={7} className="mb-4 mb-lg-0">
              <div className="home-hero-text">
                <Badge bg="light" text="dark" className="mb-3 border home-hero-badge">
                  <GiDart className="me-2" />
                  Self-hosted darts scoring for you & friends
                </Badge>

                <h1 className="home-hero-title">
                  Darts scorer for people who like{' '}
                  <span className="home-hero-title-accent">clean UIs</span>.
                </h1>

                <p className="home-hero-subtitle">
                  A small, focused web app for scoring local darts games. Built with
                  React, React-Bootstrap and a Go backend, designed to be self-hosted in
                  Docker and reverse-proxied by NGINX.
                </p>

                <Stack direction="horizontal" gap={3} className="flex-wrap mb-3">
                  <Button
                    as={Link}
                    to="/new-game"
                    variant="primary"
                    size="lg"
                  >
                    Start a new game
                  </Button>

                  <Button
                    as={Link}
                    to="/players"
                    variant="outline-secondary"
                    size="lg"
                  >
                    Manage players
                  </Button>
                </Stack>

                <div className="home-hero-meta">
                  <span className="home-hero-meta-label">Supports:</span>
                  <Stack direction="horizontal" gap={2} className="flex-wrap">
                    <Badge bg="light" text="dark" className="border">
                      301 / 501 X01
                    </Badge>
                    <Badge bg="light" text="dark" className="border">
                      Cricket
                    </Badge>
                    <Badge bg="light" text="dark" className="border">
                      Multiple players
                    </Badge>
                    <Badge bg="light" text="dark" className="border">
                      Per-player stats
                    </Badge>
                  </Stack>
                </div>
              </div>
            </Col>

            <Col lg={5}>
              <Card className="home-hero-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="home-hero-card-title">
                      <GiBullseye className="me-2 text-danger" />
                      Sample game configuration
                    </span>
                    <Badge bg="light" text="secondary" className="border">
                      preview
                    </Badge>
                  </div>
                  <pre className="home-hero-code-block">
{`POST /games

{
  "mode": "X01",
  "startingScore": 501,
  "legs": 3,
  "sets": 1,
  "doubleOut": true,
  "players": ["alex", "chris"]
}`}
                  </pre>
                  <div className="small text-muted">
                    Frontend uses this model when you configure a new match. The same
                    structure will be exposed by the Go backend.
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* MAIN FEATURES */}
      <section className="home-section">
        <Container>
          <Row className="g-4">
            <Col md={4}>
              <Card className="home-feature-card">
                <Card.Body>
                  <div className="home-feature-icon primary">
                    <GiDart />
                  </div>
                  <Card.Title>Game-centric UI</Card.Title>
                  <Card.Text>
                    Quickly set up X01 or Cricket games, pick players, and let the app
                    take care of turns and scoring logic.
                  </Card.Text>
                  <Button
                    as={Link}
                    to="/new-game"
                    variant="link"
                    className="p-0 home-feature-link"
                  >
                    Open game setup →
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="home-feature-card">
                <Card.Body>
                  <div className="home-feature-icon secondary">
                    <FaUsers />
                  </div>
                  <Card.Title>Players & stats</Card.Title>
                  <Card.Text>
                    Maintain a simple roster of players and later view averages, wins and
                    best legs per player and game mode.
                  </Card.Text>
                  <Button
                    as={Link}
                    to="/players"
                    variant="link"
                    className="p-0 home-feature-link"
                  >
                    Go to players →
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="home-feature-card">
                <Card.Body>
                  <div className="home-feature-icon tertiary">
                    <FaChartLine />
                  </div>
                  <Card.Title>Stats-ready layout</Card.Title>
                  <Card.Text>
                    The UI already exposes hooks and components ready to plug into a stats
                    API when we implement the backend.
                  </Card.Text>
                  <Button
                    as={Link}
                    to="/stats"
                    variant="link"
                    className="p-0 home-feature-link"
                  >
                    View stats section →
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* TECH NOTES / BLOGGY SECTION */}
      <section className="home-section home-section-muted">
        <Container>
          <Row className="g-4">
            <Col lg={6}>
              <h2 className="home-section-title">Architecture notes</h2>
              <p className="home-section-text">
                This project is intentionally simple on the outside and structured on the
                inside. The frontend is a standalone React container that only talks to
                backend services over HTTP – no coupling to NGINX or Docker internals.
              </p>
              <ListGroup variant="flush" className="home-tech-list">
                <ListGroup.Item>
                  <FaReact className="me-2 text-primary" />
                  React + React-Bootstrap for UI layout and components.
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaServer className="me-2 text-secondary" />
                  Go microservices for games, players and stats (coming next).
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaDocker className="me-2 text-info" />
                  Each service in its own Docker container, wired via Docker networks.
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col lg={6}>
              <Card className="home-notes-card">
                <Card.Header className="home-notes-card-header">
                  Frontend developer notes
                </Card.Header>
                <Card.Body>
                  <ul className="home-notes-list">
                    <li>
                      API access is centralized in <code>src/api/</code> with React Query
                      hooks.
                    </li>
                    <li>
                      Domain types live in <code>src/types/darts.ts</code> and are kept in
                      sync with backend JSON shapes.
                    </li>
                    <li>
                      Pages like <code>NewGamePage</code> and <code>GamePage</code> are
                      thin; they compose reusable components from <code>src/components/</code>.
                    </li>
                    <li>
                      The layout is intentionally neutral so you can extend it like a
                      technical blog or internal docs site.
                    </li>
                  </ul>
                  <div className="small text-muted">
                    Think of this UI as the &quot;docs&quot; and &quot;control panel&quot;
                    for your darts sessions and the Go services behind them.
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
}

export default HomePage;
