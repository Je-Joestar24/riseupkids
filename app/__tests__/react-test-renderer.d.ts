/**
 * react-test-renderer ships with jest-expo but its type definitions are not installed. This declares
 * only the small part the component tests use (e.g. components/exploreExperienceDetail.e2e.test.tsx).
 */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestInstance {
    type: unknown;
    parent: ReactTestInstance | null;
    // Props are whatever the rendered component was given.
    props: Record<string, any>;
    findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[];
    findAllByType(type: unknown): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    toJSON(): unknown;
    update(element: ReactElement): void;
    unmount(): void;
  }

  export function act(callback: () => void): void;
  export function act(callback: () => Promise<void>): Promise<void>;
  export function create(element: ReactElement): ReactTestRenderer;

  const renderer: { create: typeof create; act: typeof act };
  export default renderer;
}
