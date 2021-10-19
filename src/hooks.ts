import { Observable, useMemoizedObservable, useObservable } from "micro-observables";
import { useCallback, useEffect, useRef, useState } from "react";
import { Page } from "./page";
import { MappedStore } from "./stores/mappedStore";
import { PaginatedStore } from "./stores/paginatedStore";
import { Store } from "./stores/store";

export enum FetchStrategy {
	Always = "always",
	Never = "never",
	First = "first",
	Once = "once",
}
export interface AsyncResult<T> {
	result: T | null;
	loading: boolean;
	error: Error | null;
}
export interface PaginatedDataResult<T> {
	result: readonly T[];
	loading: boolean;
	moreLoading: boolean;
	error: Error | null;
	lastPage: boolean;
	totalPages?: number;
	totalSize?: number;
	list: () => Promise<void>;
	listMore: () => Promise<void>;
}

export function useStore<T extends { [k in PrimaryKey]: string }, PrimaryKey extends string = "id">(
	id: string,
	store: Store<T, PrimaryKey>,
	fetchStrategy: FetchStrategy = FetchStrategy.Always,
	additionalDeps: unknown[] = []
): AsyncResult<T> {
	const hasFetched = useRef(false);
	const result = useMemoizedObservable(() => store.getObservable(id), [id]);

	const [loading, setLoading] = useState(!result);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!shouldFetch(fetchStrategy, result !== null, hasFetched.current)) {
			return;
		}
		setLoading(true);
		hasFetched.current = true;
		store
			.fetch(id)
			.catch((e) => setError(e))
			.finally(() => setLoading(false));
	}, [id, fetchStrategy, ...additionalDeps]);

	return { result, loading, error };
}

export function usePaginatedStore<T>(
	paginatedStore: PaginatedStore<T, any, any>,
	fetchStrategy: FetchStrategy = FetchStrategy.Always,
	additionalDeps: unknown[] = []
): PaginatedDataResult<T> {
	const loading = useObservable(paginatedStore.fetching);
	const moreLoading = useObservable(paginatedStore.fetchingMore);
	return {
		loading,
		moreLoading,
		...useObservablePaginatedData(
			paginatedStore.items,
			() => paginatedStore.list(),
			() => paginatedStore.listMore(),
			fetchStrategy,
			[...additionalDeps]
		),
	};
}

export function useMappedStore<T, S extends string>(
	id: S,
	mappedStore: MappedStore<T, S, any, any>,
	fetchStrategy: FetchStrategy = FetchStrategy.Always,
	additionalDeps: unknown[] = []
): PaginatedDataResult<T> {
	const loading = useMemoizedObservable(() => mappedStore.getFetching(id), [id]);
	const moreLoading = useMemoizedObservable(() => mappedStore.getFetchingMore(id), [id]);
	return {
		loading,
		moreLoading,
		...useObservablePaginatedData(
			mappedStore.getObservableItems(id),
			() => mappedStore.list(id),
			() => mappedStore.listMore(id),
			fetchStrategy,
			[id, ...additionalDeps]
		),
	};
}

export function useObservablePaginatedData<T>(
	observableData: Observable<Page<T> | null>,
	list: () => Promise<void>,
	listMoreData: () => Promise<void>,
	fetchStrategy: FetchStrategy = FetchStrategy.Always,
	deps: unknown[]
) {
	const hasFetched = useRef(false);
	const [error, setError] = useState(null);
	const data = useMemoizedObservable(() => observableData, deps);

	const result = data?.content ?? [];
	const totalPages = data?.totalPages;
	const totalSize = data?.totalSize;
	const lastPage = totalPages !== undefined && data !== null && data.page >= totalPages - 1;

	useEffect(() => {
		if (!shouldFetch(fetchStrategy, data !== null, hasFetched.current)) {
			return;
		}
		hasFetched.current = true;
		list().catch((e) => setError(e));
	}, [...deps, fetchStrategy]);

	const listMore = useCallback(async () => {
		if (!totalPages || !data || lastPage) {
			return;
		}
		await listMoreData();
	}, [totalPages, data, lastPage, ...deps]);

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

function shouldFetch(strategy: FetchStrategy, hasResult: boolean, hasFetched: boolean) {
	if (strategy === FetchStrategy.Never) {
		return false;
	}
	if (strategy === FetchStrategy.First && hasResult) {
		return false;
	}
	if (strategy === FetchStrategy.Once && hasFetched) {
		return false;
	}
	return true;
}
