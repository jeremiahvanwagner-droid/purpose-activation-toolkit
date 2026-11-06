/** Shared shape of the authorized payload. No curriculum strings live here. */

export type PaidPageCopy = {
  purposeActivation: Record<string, string>;
  decisionMaking: Record<string, string>;
  alignmentToAction: Record<string, string>;
  executionPrompts: Record<string, string>;
};

export type ToolkitCurriculum = {
  sentinel: string;
  purposeActivation: PaidModule;
  decisionMaking: PaidModule;
  alignmentToAction: PaidModule;
  executionPrompts: PaidModule;
  page: PaidPageCopy & { workbookEpigraph: string };
  labels: Record<string, string>;
  epigraph: string;
};

/** JSON curriculum for one module. Functions are stripped before it is sent. */
// The payload is produced by our server from the content modules. Indexing it
// keeps the client files free of those modules' types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PaidModule = any;
