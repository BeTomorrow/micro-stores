import { Observable, observable } from "micro-observables";
import { Page } from "./page";

type Fetcher<T> = (key: string) => T;
type Lister<T> = (page: number) => Page<T>;
type ReturnType<T> = T extends (...args: any) => infer R ? R : unknown;
type PageReturnType<T> = T extends (...args: any) => Page<infer R> ? R : unknown;

export interface Store<T, StoreFetcher extends Fetcher<T> | undefined, StoreLister extends Lister<T> | undefined> {
	fetch: StoreFetcher;
	save(value: T): void;
	list: StoreLister;
}

export type SuperStore<
	T,
	StoreFetcher extends Fetcher<T> | undefined,
	StoreLister extends Lister<T> | undefined
> = {} & (T extends { id: string }
	? { save(value: T): void; remove(id: string): void; getObservable(id: string): Observable<T | undefined> }
	: {}) &
	(StoreFetcher extends undefined ? {} : { fetch: StoreFetcher }) &
	(StoreLister extends undefined
		? {}
		: { list: () => void; listMore: () => void; paginatedItems: Observable<Page<T> | null> });

export function createStore<
	StoreFetcher extends Fetcher<T> | undefined = undefined,
	StoreLister extends Lister<T> | undefined = undefined,
	// T extends StoreFetcher extends undefined ? unknown : { id: string } = (StoreFetcher extends undefined
	// 	? {}
	// 	: { id: string }) &
	// 	ReturnType<StoreFetcher>
	T = PageReturnType<StoreLister> & ReturnType<StoreFetcher>
	// T = ReturnType<StoreFetcher>
>(options: {
	fetch?: StoreFetcher;
	list?: StoreLister;
}): SuperStore<
	T,
	StoreFetcher extends undefined ? undefined : StoreFetcher,
	StoreLister extends undefined ? undefined : StoreLister
> {
	const { fetch, list } = options;

	const items = observable(new Map<string, T>());
	const paginatedItems = observable<Page<T> | null>(null);

	const merge = (newItems: T[]) => {
		items.update(
			(current) =>
				new Map([
					...current,
					...newItems
						.filter((r) => typeof r === "object" && "id" in r)
						.map((item) => [(item as unknown as { id: string }).id, item] as const),
				])
		);
	};

	const fetchOne = fetch
		? (id: string) => {
				const result = fetch(id);

				items.update((curent) => new Map(curent).set(id, result)); // check immutable??
		  }
		: undefined;

	const fetchList = list
		? () => {
				const result = list(0);
				paginatedItems.set(result);
				merge(result.content);
		  }
		: undefined;

	const fetchMore = list
		? () => {
				const currentItems = paginatedItems.get();
				if (!currentItems) {
					return fetchList?.();
				}
				const result = list(currentItems.page + 1);
				paginatedItems.set({ ...result, content: [...currentItems.content, ...result.content] });
				merge(result.content);
		  }
		: undefined;

	const save = (item: T) => {
		if (typeof item === "object" && "id" in item) {
			items.update((items) => new Map(items).set((item as unknown as { id: string }).id, item));
		}
	};
	const remove = (id: string) => {
		items.update((items) => {
			const res = new Map(items);
			res.delete(id);
			return res;
		});
	};
	const getObservable = (id: string) => {
		return items.select((items) => items.get(id));
	};

	return {
		fetch: fetchOne as StoreFetcher extends undefined ? undefined : StoreFetcher,
		list: fetchList as StoreLister extends undefined ? undefined : () => void,
		listMore: fetchMore as StoreLister extends undefined ? undefined : () => void,
		save,
		remove,
		getObservable,
		paginatedItems: fetchOne
			? Observable.select([items, paginatedItems], (mapped, listed) =>
					listed
						? {
								...listed,
								content: listed.content
									.map((item) => items.get().get((item as unknown as { id: string }).id))
									.filter((c) => !!c),
						  }
						: null
			  )
			: paginatedItems,
	} as unknown as SuperStore<
		T,
		StoreFetcher extends undefined ? undefined : StoreFetcher,
		StoreLister extends undefined ? undefined : StoreLister
	>;
}
