import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          'auto-rotate'?: boolean;
          'auto-rotate-delay'?: string;
          'rotation-per-second'?: string;
          'camera-controls'?: boolean;
          'shadow-intensity'?: string;
          'shadow-softness'?: string;
          'environment-image'?: string;
          exposure?: string;
          ar?: boolean;
          'ar-modes'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: string;
          style?: React.CSSProperties;
          className?: string;
        },
        HTMLElement
      >;
    }
  }
}
