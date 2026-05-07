// Mock for 'server-only' package in vitest environment.
// The real package throws when imported outside of a Next.js Server Component.
// This no-op mock allows server-only modules to be unit-tested.
export {}
