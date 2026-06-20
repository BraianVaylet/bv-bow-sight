import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Ruler } from './Ruler';

const markers = [
  { id: 1, scaleValue: 1.2, distanceM: 18 },
  { id: 2, scaleValue: 4.4, distanceM: 50 },
];

/** Mapa textoDeMarcaCm -> y (dentro del grupo trasladado). */
function cmTickYs(container: HTMLElement): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of Array.from(container.querySelectorAll('text'))) {
    const txt = t.textContent ?? '';
    if (/^\d+$/.test(txt)) out[txt] = Number(t.getAttribute('y'));
  }
  return out;
}

describe('<Ruler>', () => {
  it('dibuja un número por cada centímetro del rango', () => {
    const { container } = render(<Ruler scaleMin={0} scaleMax={6} markers={markers} />);
    const ys = cmTickYs(container);
    // 0..6 cm
    for (const cm of ['0', '1', '2', '3', '4', '5', '6']) {
      expect(ys[cm]).toBeDefined();
    }
  });

  it('orienta el mínimo arriba (y crece hacia abajo)', () => {
    const { container } = render(<Ruler scaleMin={0} scaleMax={6} markers={markers} />);
    const ys = cmTickYs(container);
    expect(ys['0'] as number).toBeLessThan(ys['3'] as number);
    expect(ys['3'] as number).toBeLessThan(ys['6'] as number);
  });

  it('renderiza los marcadores con su distancia y valor de escala', () => {
    const { container } = render(<Ruler scaleMin={0} scaleMax={6} markers={markers} />);
    const text = container.textContent ?? '';
    expect(text).toContain('18');
    expect(text).toContain('50');
    expect(text).toContain('escala 1.2');
    expect(text).toContain('escala 4.4');
  });

  it('dispara onMarkerClick con el id al tocar un marcador', () => {
    const onMarkerClick = vi.fn();
    render(<Ruler scaleMin={0} scaleMax={6} markers={markers} onMarkerClick={onMarkerClick} />);
    const title = screen.getByText('18 m · escala 1.2');
    const hitRect = title.parentElement as Element;
    fireEvent.click(hitRect);
    expect(onMarkerClick).toHaveBeenCalledWith(1);
  });

  it('no rompe sin marcadores', () => {
    const { container } = render(<Ruler scaleMin={0} scaleMax={5} markers={[]} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
