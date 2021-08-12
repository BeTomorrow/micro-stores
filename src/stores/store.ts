import { Observable, observable } from "micro-observables";
import { Signal } from "micro-signals";
import { F, O, S } from "ts-toolbelt";
import { retrieveReference } from "../utils";
import { v4 } from "uuid";
// interface ReferencedProperty<
// 	T extends { id: string },
// 	P extends string,
// 	V = ReferenceStore<O.Path<T, S.Split<P, ".">> & { id: string }>
// > {
// 	path: F.AutoPath<T, P>;
// 	store: V;
// 	compute?: (initial: ReferenceStore<O.Path<T, S.Split<P, ".">> & { id: string }>) => V;
// }

// type ReturnType<T> = T extends (...args: any) => infer R ? R : unknown;
// type PageReturnType<T> = T extends (...args: any) => Page<infer R> ? R : unknown;

export interface ReferenceStore<T extends { id: string }> {
	items: Observable<Map<string, T>>;
	merge(items: readonly T[], updateId?: string): void;
	batchUpdate(items: readonly (Partial<T> & { id: string })[]): void;
	onDelete: Signal<string>;
}

type PathValue<T, P extends string> = O.Path<T, S.Split<P, ".">>;

export class Store<T extends { id: string }> implements ReferenceStore<T> {
	private _itemsById = observable(new Map<string, T>());

	private _onNewElements = new Signal<{ updateId: string; content: T[] }>();
	onDelete = new Signal<string>();

	private referencedProperties: {
		path: string;
		store: ReferenceStore<{ id: string }>;
	}[] = [];

	constructor(private readonly _fetch: (id: string) => Promise<T> | T) {}

	bindProperty<PP extends string, V extends PathValue<T, PP> & { id: string }>(
		path: F.AutoPath<T, PP>,
		referenceStore: ReferenceStore<V>
	) {
		this.referencedProperties.push({ path, store: referenceStore });
		this._onNewElements.add(({ updateId, content }) => {
			if (updateId === path) {
				// Ensure we don't go in an infinite loop
				return;
			}
			const keys = path.split(".");
			const getProperty = <TProperty>(property: TProperty, i: number): unknown => {
				const key = keys[i] as keyof TProperty;
				const subProperty = property[key];
				if (i >= keys.length - 1 || subProperty === undefined) {
					return subProperty;
				}
				return getProperty(subProperty, i + 1);
			};

			referenceStore.merge(
				content.map((item) => getProperty(item, 0) as V).filter((v) => v !== undefined),
				path
			);
		});
		return this;
	}

	get items(): Observable<Map<string, T>> {
		if (this.referencedProperties.length > 0) {
			return Observable.select(
				[this._itemsById, ...this.referencedProperties.map((p) => p.store.items)],
				(items, ...subItems) => {
					let newItems = [...items];
					for (const [j, subItemsValues] of subItems.entries()) {
						const keys = this.referencedProperties[j].path.split(".");
						newItems = newItems.map(([k, v]) => [k, retrieveReference(v, 0, subItemsValues, keys)]);
					}
					return new Map(newItems);
				}
			);
		}
		return this._itemsById.readOnly();
	}

	getObservable(id: string): Observable<T | null> {
		return this.items.select((items) => items.get(id) ?? null);
	}

	save(item: T) {
		this._itemsById.update((items) => new Map(items).set(item.id, item));
		this._onNewElements.dispatch({ updateId: "save", content: [item] });
	}
	merge(items: T[], updateId = v4()) {
		this._itemsById.update((current) => new Map([...current, ...items.map((item) => [item.id, item] as const)]));
		this._onNewElements.dispatch({ updateId, content: items });
	}

	batchUpdate(items: readonly (Partial<T> & { id: string })[]) {
		this._itemsById.update((current) => {
			const newMap = new Map(current);
			items.forEach((item) => {
				const current = newMap.get(item.id);
				if (current) {
					newMap.set(item.id, { ...current, ...item });
				}
			});

			return newMap;
		});
	}

	update(key: string, updater: (current: T) => T): void {
		const item = this._itemsById.get().get(key);
		if (item) {
			this._itemsById.update((items) => new Map(items).set(item.id, updater(item)));
		}
	}
	remove(key: string) {
		this._itemsById.update((items) => {
			const res = new Map(items);
			res.delete(key);
			return res;
		});
		this.onDelete.dispatch(key);
	}

	async fetch(id: string) {
		const result = await this._fetch(id);
		this._itemsById.update((current) => new Map(current).set(id, result));
		this._onNewElements.dispatch({ updateId: "fetch", content: [result] });
	}
}
