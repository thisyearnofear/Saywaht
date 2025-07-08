// Type declarations for modules without type definitions

declare module 'react' {
  import * as React from 'react';
  export = React;
  export as namespace React;
}

declare module 'next/dynamic' {
  import { ComponentType, ReactNode } from 'react';

  export interface DynamicOptions {
    loading?: ComponentType;
    ssr?: boolean;
    suspense?: boolean;
  }

  export default function dynamic<P = {}>(dynamicOptions: () => Promise<ComponentType<P>>, options?: DynamicOptions): ComponentType<P>;
}

declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }
  export const ChevronUp: ComponentType<IconProps>;
  export const ChevronDown: ComponentType<IconProps>;
  export const Maximize2: ComponentType<IconProps>;
  export const Minimize2: ComponentType<IconProps>;
  export const Monitor: ComponentType<IconProps>;
  export const Smartphone: ComponentType<IconProps>;
}

declare module 'next' {
  import { ReactNode } from 'react';
  export interface Metadata {
    title?: string;
    description?: string;
    [key: string]: any;
  }
  export type NextPage<P = {}, IP = P> = React.ComponentType<P> & {
    getInitialProps?: (context: any) => IP | Promise<IP>;
  };
}

declare module 'next/font/google' {
  export interface FontOptions {
    weight?: string | string[];
    style?: string | string[];
    subsets?: string[];
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
    variable?: string;
  }
  export function Inter(options: FontOptions): {
    className: string;
    style: { fontFamily: string };
    variable: string;
  };
}

declare module 'next-themes' {
  import { ReactNode } from 'react';
  export interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: string;
    storageKey?: string;
    themes?: string[];
    forcedTheme?: string;
    disableTransitionOnChange?: boolean;
    enableSystem?: boolean;
    enableColorScheme?: boolean;
    attribute?: string;
  }
  export function ThemeProvider(props: ThemeProviderProps): JSX.Element;
}

declare module '@vercel/analytics/react' {
  import { ReactNode } from 'react';
  export interface AnalyticsProps {
    children?: ReactNode;
  }
  export function Analytics(props?: AnalyticsProps): JSX.Element | null;
}

declare module 'next/script' {
  import { ReactNode } from 'react';
  export interface ScriptProps {
    src?: string;
    strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
    onLoad?: () => void;
    onError?: () => void;
    children?: ReactNode;
    id?: string;
  }
  export default function Script(props: ScriptProps): JSX.Element;
}

// Add JSX namespace to fix "JSX element implicitly has type 'any'" errors
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}