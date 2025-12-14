import { Navbar, Nav, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

function AppNavbar() {
  return (
    <Navbar bg="dark" variant="dark" expand="sm">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand>Darts Scorer</Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <LinkContainer to="/new-game">
              <Nav.Link>New Game</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/players">
              <Nav.Link>Players</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/stats">
              <Nav.Link>Stats</Nav.Link>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;
