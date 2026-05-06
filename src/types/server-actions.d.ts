/**
 * Next.js 15 Server Action form action type augmentation.
 *
 * @types/react's form `action` prop only allows `(formData: FormData) => void | Promise<void>`.
 * Server Actions that return `{ error: string | null }` for testability fall outside this type.
 * This augmentation registers our Server Action return type via the React extension interface
 * so TypeScript accepts them as form `action` values.
 *
 * See: @types/react DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS
 */
declare namespace React {
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS {
    serverActionWithResult: (
      formData: FormData,
    ) => Promise<{ error: string | null }>
    serverActionNoArg: () => Promise<{ error: string | null }>
  }
}
