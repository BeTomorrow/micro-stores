import { Observable, observable } from "micro-observables";
import { Page } from "../page";
import { presentItems } from "../utils";
import { ReferenceStore } from "./store";

export class PaginatedStore<
	T,
	Presented extends T extends { [k in PresentedKey]: string } ? T : never,
	PresentedKey extends string
> {
	private _paginatedItems = observable<Page<T> | null>(null);
	private _referenceStore?: ReferenceStore<Presented, PresentedKey>;
	private _deletedItems = observable<Set<string>>(new Set());

	fetching = observable(false);
	fetchingMore = observable(false);

	constructor(private readonly _fetchList: (page: number) => Promise<Page<T>> | Page<T>) {}

	present(store: ReferenceStore<T extends { [k in PresentedKey]: string } ? Presented : never, PresentedKey>) {
		this._referenceStore = store;
		this._referenceStore.onDelete.add((id) => {
			this._deletedItems.update((s) => new Set(s).add(id));
		});
		this._referenceStore.onUpdateAttemptOnNonExistingItem.add(({ key, updater }) => {
			this._paginatedItems.update((items) => {
				if (!items) {
					return null;
				}
				const newItems = {
					...items,
					content: items.content.map((item) => {
						try {
							if ((item as Presented)[this._referenceStore!.primaryKey] === key) {
								return updater(item);
							}
							return item;
						} catch (e) {
							return item;
						}
					}),
				};
				return newItems;
			});
		});
		this._paginatedItems.subscribe((data) => {
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
		this._paginatedItems.subscribe((data) => {
			if (data === null) {
				return;
			}
			store?.merge(data.content as U[]);
		});
		return this;
	}

	get items() {
		if (!this._referenceStore) {
			return this._paginatedItems;
		}
		return Observable.select(
			[this._referenceStore.items, this._paginatedItems, this._deletedItems],
			(mapped, listed, deleted) =>
				presentItems(
					mapped,
					listed as Page<T & { [k in PresentedKey]: string }> | null,
					deleted,
					this._referenceStore?.primaryKey
				)
		);
	}

	async list(): Promise<void> {
		if (this.fetching.get()) {
			return;
		}
		this.fetching.set(true);
		try {
			const result = await this._fetchList(0);
			this._paginatedItems.set(result);
		} finally {
			this.fetching.set(false);
		}
	}

	async listMore(): Promise<void> {
		if (this.fetching.get() || this.fetchingMore.get()) {
			return;
		}
		const currentItems = this._paginatedItems.get();
		if (!currentItems) {
			return this.list();
		}
		try {
			this.fetchingMore.set(true);
			const newItems = await this._fetchList(currentItems.page + 1);
			this._paginatedItems.set({
				...newItems,
				content: [...currentItems.content, ...newItems.content],
			});
		} finally {
			this.fetchingMore.set(false);
		}
	}

	clear() {
		this._paginatedItems.set(null);
	}
}
