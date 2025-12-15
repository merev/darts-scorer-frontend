import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { GiDart } from 'react-icons/gi';
import { FaUsers, FaChartLine, FaHistory } from 'react-icons/fa';

import './home.css';

function HomePage() {
  return (
    <div className="home-root">
      <section className="home-hero-simple">
        <Container>
          <div className="home-hero-inner text-center">
            <GiDart className="home-logo-icon" />

            <h1 className="home-title">Darts Night</h1>
            <p className="home-subtitle">
              Simple scorer for you and your friends.
            </p>

            <Row className="justify-content-center g-3 mt-4">
              <Col xs={12} sm="auto">
                <Button
                  as={Link}
                  to="/new-game"
                  size="lg"
                  className="home-btn primary"
                >
                  Start a game
                </Button>
              </Col>
              <Col xs={12} sm="auto">
                <Button
                  as={Link}
                  to="/players"
                  size="lg"
                  className="home-btn secondary"
                  variant="outline-light"
                >
                  <FaUsers className="me-2" />
                  Players
                </Button>
              </Col>
              <Col xs={12} sm="auto">
                <Button
                  as={Link}
                  to="/stats"
                  size="lg"
                  className="home-btn tertiary"
                  variant="outline-light"
                >
                  <FaChartLine className="me-2" />
                  Stats
                </Button>
              </Col>
              <Col xs={12} sm="auto">
                <Button
                  as={Link}
                  to="/stats"
                  size="lg"
                  className="home-btn subtle"
                  variant="outline-light"
                >
                  <FaHistory className="me-2" />
                  Game history
                </Button>
              </Col>
            </Row>
          </div>
        </Container>
      </section>

      {/* <section className="home-footer-note">
        <Container>
          <p className="home-footer-text">
            Built with React & React-Bootstrap. Frontend runs as a standalone Docker
            container behind your existing NGINX.
          </p>
        </Container>
      </section> */}
    </div>
  );
}

export default HomePage;
