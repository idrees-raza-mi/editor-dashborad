import { useState } from 'react';

const variantStyles = {
  primary: {
    background: 'var(--black)',
    color: 'white',
    border: 'none',
    hoverBg: 'var(--black2)',
    hoverColor: 'white',
  },
  outline: {
    background: 'white',
    color: 'var(--black)',
    border: '1px solid var(--border)',
    hoverBg: 'var(--cream2)',
    hoverColor: 'var(--black)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--mid)',
    border: 'none',
    hoverBg: 'transparent',
    hoverColor: 'var(--black)',
  },
  danger: {
    background: 'transparent',
    color: 'var(--red-tx)',
    border: '1px solid var(--red-tx)',
    hoverBg: 'var(--red-bg)',
    hoverColor: 'var(--red-tx)',
  },
};

const sizeStyles = {
  md: { padding: '8px 14px', fontSize: 13, iconSize: 16 },
  sm: { padding: '5px 10px', fontSize: 12, iconSize: 14 },
};

export default function Button({
  variant = 'primary',
  icon: Icon,
  children,
  onClick,
  size = 'md',
  disabled = false,
  loading = false,
  style = {},
}) {
  const [hovered, setHovered] = useState(false);
  const v = variantStyles[variant] || variantStyles.primary;
  const s = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        borderRadius: 'var(--radius-sm)',
        border: v.border || 'none',
        background: hovered ? v.hoverBg : v.background,
        color: hovered ? v.hoverColor : v.color,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {loading ? (
        <span style={{
          width: s.iconSize,
          height: s.iconSize,
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.6s linear infinite',
          flexShrink: 0,
        }} />
      ) : Icon ? (
        <Icon size={s.iconSize} />
      ) : null}
      {children}
    </button>
  );
}
