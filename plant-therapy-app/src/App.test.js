import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Plant Metaphor Therapy module title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Plant Metaphor Therapy Module/i);
  expect(titleElement).toBeInTheDocument();
});
