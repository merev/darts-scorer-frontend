import Container from 'react-bootstrap/Container';

function AppFooter() {
  return (
    <footer className="app-footer app-topbar">
      <Container className="app-footer__inner app-topbar__inner">
        <div className="app-footer__text">
          Darts Scorer <span className="app-footer__dot">·</span> Created by{' '}
          <span className="app-footer__author">Merev</span>{' '}
          <span className="app-footer__dot">·</span> {new Date().getFullYear()}
        </div>
      </Container>
    </footer>
  );
}

export default AppFooter;
