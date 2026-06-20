import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: 10, label: 'VAP' },
  { value: 20, label: 'Hunter' },
];

describe('<SegmentedControl>', () => {
  it('marca como seleccionada la opción activa', () => {
    render(<SegmentedControl options={options} value={10} onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'VAP' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Hunter' })).toHaveAttribute('aria-selected', 'false');
  });

  it('llama onChange con el value al tocar otra opción', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value={10} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Hunter' }));
    expect(onChange).toHaveBeenCalledWith(20);
  });
});
