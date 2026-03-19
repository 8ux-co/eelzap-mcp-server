const CODEGEN_HINT = {
  action: 'run_codegen' as const,
  message:
    'The CMS schema has changed. If the user has @8ux-co/eelzap-api-sdk-ts installed, suggest running `npx eelzap-codegen` to regenerate TypeScript types so they stay in sync with the CMS.',
  command: 'npx eelzap-codegen',
};

export function withCodegenHint<T extends Record<string, unknown>>(result: T): T & {
  _hint: typeof CODEGEN_HINT;
} {
  return {
    ...result,
    _hint: CODEGEN_HINT,
  };
}
