import { Card } from 'react-bootstrap';

function StatsPage() {
  return (
    <Card>
      <Card.Body>
        <Card.Title>Statistics</Card.Title>
        <p>
          This page will show:
        </p>
        <ul>
          <li>Recent games and their results</li>
          <li>Per-player averages, best legs, checkouts</li>
          <li>Mode-specific stats (X01, Cricket, etc.)</li>
        </ul>
        <p>
          Once we have the backend and database in place, we can hook this up to real
          stats and charts.
        </p>
      </Card.Body>
    </Card>
  );
}

export default StatsPage;
