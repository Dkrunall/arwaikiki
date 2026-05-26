declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        'auto-rotate'?: boolean | string;
        'camera-controls'?: boolean | string;
        'shadow-intensity'?: string;
        'environment-image'?: string;
        exposure?: string;
        ar?: boolean | string;
        'ar-modes'?: string;
        poster?: string;
        loading?: string;
        reveal?: string;
        style?: React.CSSProperties;
        class?: string;
      },
      HTMLElement
    >;
  }
}
