import { render, screen } from '@testing-library/react';
import React from 'react';
import { SimpleCircularProgress } from '../SimpleCircularProgress';

describe('SimpleCircularProgress', () => {
  it('exposes progressbar semantics with clamped values', () => {
    render(<SimpleCircularProgress value={135} ariaLabel="Model loading" />);

    const progress = screen.getByRole('progressbar', { name: /model loading/i });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '100');
    expect(progress).toHaveTextContent('100%');
  });
});
