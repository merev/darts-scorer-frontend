import Container from 'react-bootstrap/Container';

function AppFooter() {
  return (
    <footer className="app-footer bg-dark text-light">
      <Container className="d-flex justify-content-between align-items-center py-2">
        <div className="small">
          Darts Scorer · Self-hosted · {new Date().getFullYear()}
        </div>
      </Container>
    </footer>
  );
}

export default AppFooter;
