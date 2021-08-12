import { Page } from "./page";

export function presentItems<T extends { [k in PrimaryKey]: string }, PrimaryKey extends string = "id">(
	refItems: Map<string, T>,
	paginatedItems: Page<T> | null,
	deletedItems: Set<string>,
	primaryKey?: PrimaryKey
): Page<T> | null {
	const usedKey = primaryKey ?? ("id" as PrimaryKey);
	return paginatedItems
		? {
				...paginatedItems,
				content: paginatedItems.content
					.map((item) => refItems.get(item[usedKey]) ?? (deletedItems.has(item[usedKey]) ? null : item))
					.filter((c): c is T => !!c),
		  }
		: null;
}

export function retrieveReference<TProperty, PrimaryKey extends string = "id">(
	property: TProperty,
	i: number,
	itemsMap: Map<string, { [k in PrimaryKey]: string }>,
	arrayPath: string[],
	primaryKey?: PrimaryKey
): TProperty {
	const key = arrayPath[i] as keyof TProperty;
	if (i >= arrayPath.length - 1) {
		return {
			...property,
			[key]:
				property[key] &&
				itemsMap.get((property[key] as unknown as { [k in PrimaryKey | "id"]: string })[primaryKey ?? "id"]),
		};
	}
	return {
		...property,
		[key]: property[key] && retrieveReference(property[key], i + 1, itemsMap, arrayPath, primaryKey),
	};
}
