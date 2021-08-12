import { Observable, observable } from "micro-observables";
import { Signal } from "micro-signals";
import { Page } from "../page";
import { presentItems } from "../utils";
import { ReferenceStore } from "./store";

export class MappedStore<
	T,
	Presented extends T extends { id: string } ? T : never,
	S extends string = string,
	Args extends unknown[] = []
> {
	_mappedItems = observable(new Map<S, Page<T>>());
	// private _referenceStore?: T extends { id: string } ? ReferenceStore<T> : undefined;
	private _referenceStore?: ReferenceStore<Presented>;

	private _deletedItems = observable<Set<string>>(new Set());

	constructor(private readonly _fetchList: (id: S, page: number, ...args: Args) => Promise<Page<T>> | Page<T>) {}

	present(store: ReferenceStore<T extends { id: string } ? Presented : never>) {
		this._referenceStore = store;
		this._referenceStore.onDelete.add((id) => {
			this._deletedItems.update((s) => new Set(s).add(id));
		});
		this.onChange.add(({ data }) => {
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
				presentItems<T & { id: string }>(mapped, listed as Page<T & { id: string }> | null, deleted)
		);
	}

	async list(id: S, ...args: Args): Promise<void> {
		const result = await this._fetchList(id, 0, ...args);
		this._mappedItems.update((items) => new Map(items).set(id, result));
		this.dispatchChange(id);
	}

	async listMore(id: S, ...args: Args): Promise<void> {
		const currentItems = this._mappedItems.get().get(id);
		if (!currentItems) {
			return this.list(id, ...args);
		}
		const newItems = await this._fetchList(id, currentItems.page + 1, ...args);
		this._mappedItems.update((items) =>
			new Map(items).set(id, {
				...newItems,
				content: [...currentItems.content, ...newItems.content],
			})
		);
		this.dispatchChange(id);
	}

	private onChange = new Signal<{ id: S; data: Page<T> | null }>();
	private dispatchChange(id: S): void {
		this.onChange.dispatch({ id, data: this._mappedItems.get().get(id) ?? null });
	}
}
