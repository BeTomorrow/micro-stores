export type Page<T> = {
	content: T[];
	page: number;
	total_pages: number;
	total_size: number;
};

export interface PaginationOptions {
	page: number;
}
