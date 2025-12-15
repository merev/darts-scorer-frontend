import React from 'react';
import { Alert, Container } from 'react-bootstrap';

interface State {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // You can log this somewhere if you want
    console.error('Uncaught app error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-root">
          <Container className="py-5">
            <Alert variant="danger">
              <Alert.Heading>Something went wrong</Alert.Heading>
              <p>
                The UI hit an unexpected error. This can happen while the backend is
                offline or during development.
              </p>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={this.handleReload}
                >
                  Reload app
                </button>
              </div>
            </Alert>
          </Container>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
