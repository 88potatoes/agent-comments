// ── View Model ──────────────────────────────────────────────────
// Pure display types. UI components consume ONLY these.
// No domain enums, no mutability, no React dependencies.

// ── single comment row ─────────────────────────────────────────

export type CommentRowViewModel = {
  id: string;
  shortId: string;
  icon: string;
  iconColor: string;
  file: string;
  message: string;
  startLine: number;
  endLine: number;
  isSelected: boolean;
  isResolved: boolean;
};

// ── popup ──────────────────────────────────────────────────────

export type PopupActionViewModel = {
  key: string;
  label: string;
};

export type CommentPopupViewModel = {
  comment: CommentRowViewModel;
  actions: PopupActionViewModel[];
  selectedActionIndex: number;
};

// ── filter bar ─────────────────────────────────────────────────

export type FilterBarViewModel = {
  filterInput: string;
};

// ── whole list ─────────────────────────────────────────────────

export type CommentListViewModel = {
  repoRoot: string;
  totalCount: number;
  filter: string;
  showResolved: boolean;
  rows: CommentRowViewModel[];
  popup: CommentPopupViewModel | null;
  filterBar: FilterBarViewModel | null;
};