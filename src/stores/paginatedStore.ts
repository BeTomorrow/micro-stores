import { Observable, observable } from "micro-observables";
import { Page } from "../page";
import { presentItems } from "../utils";
import { ReferenceStore } from "./store";

export class PaginatedStore<T, Presented extends T extends { id: string } ? T : never, Args extends unknown[] = []> {
	private _paginatedItems = observable<Page<T> | null>(null);
	private _referenceStore?: ReferenceStore<Presented>;
	private _deletedItems = observable<Set<string>>(new Set());

	constructor(private readonly _fetchList: (page: number, ...args: Args) => Promise<Page<T>> | Page<T>) {}

	present(store: ReferenceStore<T extends { id: string } ? Presented : never>) {
		this._referenceStore = store;
		this._referenceStore.onDelete.add((id) => {
			this._deletedItems.update((s) => new Set(s).add(id));
		});
		this._paginatedItems.subscribe((data) => {
			if (data === null) {
				return;
			}
			store?.batchUpdate(data.content as readonly (T extends { id: string } ? T : never)[]);
		});
		return this;
	}

	bind<U extends T & { id: string }>(store: T extends U ? ReferenceStore<U> : never) {
		this._referenceStore = store as ReferenceStore<T & { id: string }> as ReferenceStore<Presented>;
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

	get paginatedItems() {
		if (!this._referenceStore) {
			return this._paginatedItems;
		}
		return Observable.select(
			[this._referenceStore.items, this._paginatedItems, this._deletedItems],
			(mapped, listed, deleted) =>
				presentItems<T & { id: string }>(mapped, listed as Page<T & { id: string }> | null, deleted)
		);
	}

	async list(...args: Args): Promise<void> {
		const result = await this._fetchList(0, ...args);
		this._paginatedItems.set(result);
	}

	async listMore(...args: Args): Promise<void> {
		const currentItems = this._paginatedItems.get();
		if (!currentItems) {
			return this.list(...args);
		}
		const newItems = await this._fetchList(currentItems.page + 1, ...args);
		this._paginatedItems.set({
			...newItems,
			content: [...currentItems.content, ...newItems.content],
		});
	}
}
