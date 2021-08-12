export type Page<T> = {
	content: readonly T[];
	page: number;
	totalPages: number;
	totalSize: number;
};

export interface PaginationOptions {
	page: number;
}
