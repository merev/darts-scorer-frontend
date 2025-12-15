import Container from 'react-bootstrap/Container';

function AppFooter() {
  return (
    <footer className="app-footer bg-dark text-light">
      <Container className="d-flex justify-content-between align-items-center py-2">
        <span className="small">
          Darts Scorer · Self-hosted · {new Date().getFullYear()}
        </span>
        <span className="small text-muted">
          Built with React & Go · Docker & NGINX
        </span>
      </Container>
    </footer>
  );
}

export default AppFooter;
