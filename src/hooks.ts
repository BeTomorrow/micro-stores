import { Observable, useMemoizedObservable, useObservable } from "micro-observables";
import { useCallback, useEffect, useState } from "react";
import { Page } from "./page";
import { MappedStore } from "./stores/mappedStore";
import { PaginatedStore } from "./stores/paginatedStore";
import { Store } from "./stores/store";

export interface AsyncResult<T> {
	result: T | null;
	loading: boolean;
	error: Error | null;
}
export interface PaginatedDataResult<T, Args extends unknown[]> {
	result: readonly T[];
	loading: boolean;
	moreLoading: boolean;
	error: Error | null;
	lastPage: boolean;
	totalPages?: number;
	totalSize?: number;
	list: (...args: Args) => Promise<void>;
	listMore: (...args: Args) => Promise<void>;
}

export function useStore<T extends { id: string }, Args extends unknown[]>(
	id: string,
	store: Store<T, Args>,
	deps: unknown[],
	...args: Args
): AsyncResult<T> {
	const result = useMemoizedObservable(() => store.getObservable(id), [id]);

	const [loading, setLoading] = useState(!result);
	const [error, setError] = useState(null);

	useEffect(() => {
		setLoading(true);
		store
			.fetch(id, ...args)
			.catch((e) => setError(e))
			.finally(() => setLoading(false));
	}, [id, ...deps, ...args]);

	return { result, loading, error };
}

export function usePaginatedStore<T, Args extends unknown[]>(
	paginatedStore: PaginatedStore<T, Args, any, any>,
	deps: unknown[],
	...args: Args
): PaginatedDataResult<T, Args> {
	const loading = useObservable(paginatedStore.fetching);
	const moreLoading = useObservable(paginatedStore.fetchingMore);
	return {
		loading,
		moreLoading,
		...useObservablePaginatedData(
			paginatedStore.items,
			() => paginatedStore.list(...args),
			() => paginatedStore.listMore(...args),
			[...deps, ...args]
		),
	};
}

export function useMappedStore<T, S extends string, Args extends unknown[]>(
	id: S,
	mappedStore: MappedStore<T, S, Args, any, any>,
	deps: unknown[],
	...args: Args
): PaginatedDataResult<T, Args> {
	const loading = useMemoizedObservable(() => mappedStore.getFetching(id), [id]);
	const moreLoading = useMemoizedObservable(() => mappedStore.getFetchingMore(id), [id]);
	return {
		loading,
		moreLoading,
		...useObservablePaginatedData(
			mappedStore.getObservableItems(id),
			() => mappedStore.list(id, ...args),
			() => mappedStore.listMore(id, ...args),
			[id, ...deps]
		),
	};
}

export function useObservablePaginatedData<T>(
	observableData: Observable<Page<T> | null>,
	list: () => Promise<void>,
	listMoreData: () => Promise<void>,
	deps: unknown[]
) {
	const [error, setError] = useState(null);

	useEffect(() => {
		list().catch((e) => setError(e));
	}, [...deps]);

	const data = useMemoizedObservable(() => observableData, deps);

	const result = data?.content ?? [];
	const totalPages = data?.totalPages;
	const totalSize = data?.totalSize;
	const lastPage = totalPages !== undefined && data !== null && data.page >= totalPages;

	const listMore = useCallback(async () => {
		if (!totalPages || !data || lastPage) {
			return;
		}
		await listMoreData();
	}, [totalPages, data, ...deps]);

	return {
		result,
		error,
		totalPages,
		totalSize,
		lastPage,
		list,
		listMore,
	};
}
