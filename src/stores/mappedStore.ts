import { Observable, observable } from "micro-observables";
import { Signal } from "micro-signals";
import { Page } from "../page";
import { presentItems } from "../utils";
import { ReferenceStore } from "./store";

export class MappedStore<
	T,
	S extends string,
	Presented extends T extends { [k in PresentedKey]: string } ? T : never,
	PresentedKey extends string
> {
	_mappedItems = observable(new Map<S, Page<T>>());
	private _referenceStore?: ReferenceStore<Presented, PresentedKey>;
	private _deletedItems = observable<Set<string>>(new Set());

	fetching = observable(new Set<S>());
	fetchingMore = observable(new Set<S>());

	getFetching(id: S) {
		return this.fetching.select((keys) => keys.has(id));
	}
	getFetchingMore(id: S) {
		return this.fetchingMore.select((keys) => keys.has(id));
	}

	constructor(private readonly _fetchList: (id: S, page: number) => Promise<Page<T>> | Page<T>) {}

	present(store: ReferenceStore<T extends { [k in PresentedKey]: string } ? Presented : never, PresentedKey>) {
		this._referenceStore = store;
		this._referenceStore.onDelete.add((id) => {
			this._deletedItems.update((s) => new Set(s).add(id));
		});
		this.onChange.add(({ data }) => {
			if (data === null) {
				return;
			}
			store?.batchUpdateProperties(data.content as readonly (T extends { [k in PresentedKey]: string } ? T : never)[]);
		});
		return this;
	}

	bind<U extends T & { [k in PresentedKey]: string }>(store: T extends U ? ReferenceStore<U, PresentedKey> : never) {
		this._referenceStore = store as ReferenceStore<T & { [k in PresentedKey]: string }, PresentedKey> as ReferenceStore<
			Presented,
			PresentedKey
		>;
		this._referenceStore.onDelete.add((id) => {
			this._deletedItems.update((s) => new Set(s).add(id));
		});
		this.onChange.add(({ data }) => {
			if (data === null) {
				return;
			}
			store?.merge(data.content as U[]);
		});
		return this;
	}

	getObservableItems(key: S): Observable<Page<T> | null> {
		const observableItems = this._mappedItems.select((items) => items.get(key) ?? null);
		if (!this._referenceStore) {
			return observableItems;
		}
		return Observable.select(
			[this._referenceStore.items, observableItems, this._deletedItems],
			(mapped, listed, deleted) =>
				presentItems(
					mapped,
					listed as Page<T & { [k in PresentedKey]: string }> | null,
					deleted,
					this._referenceStore?.primaryKey
				)
		);
	}

	async list(id: S): Promise<void> {
		if (this.fetching.get().has(id)) {
			return;
		}
		this.fetching.update((current) => new Set(current).add(id));
		try {
			const result = await this._fetchList(id, 0);
			this._mappedItems.update((items) => new Map(items).set(id, result));
			this.dispatchChange(id);
		} finally {
			this.fetching.update((current) => {
				const newSet = new Set(current);
				newSet.delete(id);
				return newSet;
			});
		}
	}

	async listMore(id: S): Promise<void> {
		if (this.fetching.get().has(id) || this.fetchingMore.get().has(id)) {
			return;
		}
		const currentItems = this._mappedItems.get().get(id);
		if (!currentItems) {
			return this.list(id);
		}
		try {
			const newItems = await this._fetchList(id, currentItems.page + 1);
			this._mappedItems.update((items) =>
				new Map(items).set(id, {
					...newItems,
					content: [...currentItems.content, ...newItems.content],
				})
			);
			this.dispatchChange(id);
		} finally {
			this.fetching.update((current) => {
				const newSet = new Set(current);
				newSet.delete(id);
				return newSet;
			});
		}
	}

	private onChange = new Signal<{ id: S; data: Page<T> | null }>();
	private dispatchChange(id: S): void {
		this.onChange.dispatch({ id, data: this._mappedItems.get().get(id) ?? null });
	}
}
