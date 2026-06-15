// Copyright (c) Floating World, LDA. All Rights Reserved.

// Vite ?raw asset import declarations
declare module '*.wgsl?raw' {
  const content: string;
  export default content;
}

declare module '*.wgsl' {
  const content: string;
  export default content;
}
