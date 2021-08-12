import { Page } from "./page";

export function presentItems<T extends { id: string }>(
	refItems: Map<string, T>,
	paginatedItems: Page<T> | null,
	deletedItems: Set<string>
): Page<T> | null {
	return paginatedItems
		? {
				...paginatedItems,
				content: paginatedItems.content
					.map((item) => refItems.get(item.id) ?? (deletedItems.has(item.id) ? null : item))
					.filter((c): c is T => !!c),
		  }
		: null;
}

// interface ReferencedProperty<T extends { id: string }, P extends string> {
// 	path: F.AutoPath<T, P>;
// 	store: ReferenceStore<O.Path<T, S.Split<P, ".">> & { id: string }>;
// }

export function retrieveReference<TProperty>(
	property: TProperty,
	i: number,
	itemsMap: Map<string, { id: string }>,
	arrayPath: string[]
): TProperty {
	const key = arrayPath[i] as keyof TProperty;
	if (i >= arrayPath.length - 1) {
		return {
			...property,
			[key]: property[key] && itemsMap.get((property[key] as unknown as { id: string }).id),
		};
	}
	return { ...property, [key]: property[key] && retrieveReference(property[key], i + 1, itemsMap, arrayPath) };
}
