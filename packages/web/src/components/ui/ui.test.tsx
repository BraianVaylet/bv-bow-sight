import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, EmptyState, FieldError } from './index';

describe('UI kit (estados)', () => {
  it('Button en loading muestra spinner y queda deshabilitado', () => {
    const { container } = render(<Button loading>Guardar</Button>);
    const btn = screen.getByRole('button', { name: /Guardar/ });
    expect(btn).toBeDisabled();
    expect(container.querySelector('svg')).toBeInTheDocument(); // spinner
  });

  it('Button respeta type=submit cuando se especifica', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit');
  });

  it('FieldError no renderiza nada si está vacío', () => {
    const { container } = render(<FieldError>{undefined}</FieldError>);
    expect(container).toBeEmptyDOMElement();
  });

  it('EmptyState muestra título, descripción y acción', () => {
    render(
      <EmptyState
        title="Sin datos"
        description="Cargá algo"
        action={<button type="button">+ Add</button>}
      />,
    );
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.getByText('Cargá algo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add' })).toBeInTheDocument();
  });
});
